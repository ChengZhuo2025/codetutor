import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { MATERIAL_PLAN_MAX_LINKS } from "./constants.ts"
import { MaterialPlanError, materialFetchFailed } from "./errors.ts"
import { buildChunks, summarizeChunks, type MaterialChunk } from "./normalizer.ts"
import { resolveMaterialSourceAdapter } from "./source-resolver.ts"

export type MaterialPlanSubmissionInput = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}

export type MaterialPlanSubmissionResult = {
  processingMode: "async"
  intakeId: string
  runId: string
  draftId: null
  status: "queued"
}

export type MaterialIntakeResult = {
  intakeId: string
  sourceSnapshots: Array<{
    id: string
    url: string
    sourceType: string
    title: string | null
    contentExcerpt: string | null
    metadata: Record<string, unknown>
  }>
  chunks: MaterialChunk[]
  summary: string
}

function toPersistedSourceType(sourceType: "article" | "video" | "image_post") {
  if (sourceType === "image_post") {
    return "unknown"
  }
  return sourceType
}

function normalizeLinks(links: string[]) {
  if (links.length === 0 || links.length > MATERIAL_PLAN_MAX_LINKS) {
    throw new MaterialPlanError(
      "VALIDATION_FAILED",
      `links 数量必须在 1 到 ${MATERIAL_PLAN_MAX_LINKS} 之间。`,
      422,
    )
  }

  const normalizedLinks = [...new Set(links.map((link) => link.trim()).filter(Boolean))]
  if (normalizedLinks.length === 0) {
    throw new MaterialPlanError("VALIDATION_FAILED", "links 不能为空。", 422)
  }

  return normalizedLinks.map((url) => ({
    url,
    adapter: resolveMaterialSourceAdapter(url),
  }))
}

export async function submitMaterialPlanGeneration(
  supabase: SupabaseClient,
  userId: string,
  input: MaterialPlanSubmissionInput,
): Promise<MaterialPlanSubmissionResult> {
  const normalizedLinks = normalizeLinks(input.links)
  const now = new Date().toISOString()

  const { data: intakeRow, error: intakeInsertError } = await supabase
    .from("learning_material_intakes")
    .insert({
      user_id: userId,
      status: "queued",
      processing_stage: "queued",
      progress_percent: 0,
      progress_message: "已提交，等待开始处理。",
      input_links: normalizedLinks.map((item) => item.url),
      source_kind: normalizedLinks[0]?.adapter.sourceCode ?? null,
      current_constraints: input.currentConstraints ?? null,
      metadata: {
        userGoal: input.userGoal ?? null,
        weeklyHours: input.weeklyHours ?? null,
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(intakeInsertError, "failed to insert material intake")
  const intakeId = intakeRow?.id as string

  const { data: runRow, error: runInsertError } = await supabase
    .from("learning_plan_generation_runs")
    .insert({
      user_id: userId,
      intake_id: intakeId,
      trigger_type: "submit",
      status: "queued",
      source_snapshot: {
        links: normalizedLinks.map((item) => item.url),
      },
      planner_input: {
        userGoal: input.userGoal ?? null,
        weeklyHours: input.weeklyHours ?? null,
        currentConstraints: input.currentConstraints ?? null,
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(runInsertError, "failed to insert material plan generation run")
  const runId = runRow?.id as string

  const { error: intakeUpdateError } = await supabase
    .from("learning_material_intakes")
    .update({
      latest_run_id: runId,
      updated_at: now,
    })
    .eq("id", intakeId)

  assertSupabaseSuccess(intakeUpdateError, "failed to link intake latest run")

  return {
    processingMode: "async",
    intakeId,
    runId,
    draftId: null,
    status: "queued",
  }
}

export async function runMaterialIntake(
  supabase: SupabaseClient,
  intakeId: string,
  links: string[],
): Promise<MaterialIntakeResult> {
  const normalizedLinks = normalizeLinks(links)
  const now = new Date().toISOString()

  const { error: deleteSourceError } = await supabase
    .from("learning_material_sources")
    .delete()
    .eq("intake_id", intakeId)

  assertSupabaseSuccess(deleteSourceError, "failed to reset material sources")

  const allChunks: MaterialChunk[] = []
  const sourceSnapshots: MaterialIntakeResult["sourceSnapshots"] = []

  for (let i = 0; i < normalizedLinks.length; i += 1) {
    const current = normalizedLinks[i]!
    try {
      const fetched = await current.adapter.fetch(current.url)
      const text = fetched.rawTextBlocks.join("\n\n").trim()

      const { data: sourceRow, error: sourceError } = await supabase
        .from("learning_material_sources")
        .insert({
          intake_id: intakeId,
          url: fetched.canonicalUrl,
          source_type: toPersistedSourceType(fetched.sourceType),
          fetch_status: "succeeded",
          title: fetched.title,
          content_excerpt: (fetched.description ?? text).slice(0, 2000),
          token_estimate: Math.ceil(text.length / 3),
          metadata: {
            sourceCode: current.adapter.sourceCode,
            warnings: fetched.warnings,
            mediaAssets: fetched.mediaAssets,
            subtitleTracks: fetched.subtitleTracks,
            coverImageUrl: fetched.coverImageUrl,
            authorName: fetched.authorName,
          },
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single()

      assertSupabaseSuccess(sourceError, "failed to insert material source")
      const sourceId = (sourceRow as { id: string } | null)?.id
      if (!sourceId) {
        throw new Error("material source insert did not return id")
      }

      const chunks = buildChunks(fetched.canonicalUrl, text, i + 1, sourceId)
      allChunks.push(...chunks)
      sourceSnapshots.push({
        id: sourceId,
        url: fetched.canonicalUrl,
        sourceType: fetched.sourceType,
        title: fetched.title,
        contentExcerpt: (fetched.description ?? text).slice(0, 2000),
        metadata: {
          sourceCode: current.adapter.sourceCode,
          warnings: fetched.warnings,
          mediaAssets: fetched.mediaAssets,
          subtitleTracks: fetched.subtitleTracks,
          coverImageUrl: fetched.coverImageUrl,
          authorName: fetched.authorName,
        },
      })

      if (chunks.length > 0) {
        const { error: chunkError } = await supabase
          .from("learning_material_chunks")
          .insert(
            chunks.map((chunk, index) => ({
              intake_id: intakeId,
              source_id: sourceId,
              chunk_no: index,
              modality: chunk.modality,
              content: chunk.excerpt,
              summary: chunk.excerpt.slice(0, 500),
              source_ref: chunk.sourceRef,
              token_estimate: Math.ceil(chunk.excerpt.length / 3),
              created_at: now,
              updated_at: now,
            })),
          )

        assertSupabaseSuccess(chunkError, "failed to insert material chunks")
      }
    } catch (error) {
      const message = error instanceof MaterialPlanError ? error.message : "抓取失败"
      const code = error instanceof MaterialPlanError ? error.code : "MATERIAL_FETCH_FAILED"

      const { error: sourceError } = await supabase.from("learning_material_sources").insert({
        intake_id: intakeId,
        url: current.url,
        source_type: current.adapter.sourceCode === "xiaohongshu" ? "unknown" : "video",
        fetch_status: "failed",
        title: null,
        content_excerpt: null,
        token_estimate: null,
        metadata: {
          error: message,
          code,
          sourceCode: current.adapter.sourceCode,
          warnings: [message],
          mediaAssets: [],
        },
        created_at: now,
        updated_at: now,
      })

      assertSupabaseSuccess(sourceError, "failed to insert failed material source")
    }
  }

  if (allChunks.length === 0) {
    throw materialFetchFailed()
  }

  return {
    intakeId,
    sourceSnapshots,
    chunks: allChunks,
    summary: summarizeChunks(allChunks),
  }
}
