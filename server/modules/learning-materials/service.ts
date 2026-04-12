import "server-only"

import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { MATERIAL_PLAN_MAX_LINKS } from "./constants.ts"
import {
  MaterialPlanError,
  materialFetchFailed,
  materialInsufficientContent,
} from "./errors.ts"
import {
  buildChunksFromEvidence,
  evaluateMaterialEvidenceCoverage,
  summarizeChunks,
  type MaterialChunk,
  type MaterialEvidenceCoverage,
  type MaterialEvidenceInput,
} from "./normalizer.ts"
import {
  resolveMaterialPipelineModels,
  type MaterialPipelineModels,
} from "./providers.ts"
import { resolveMaterialSourceAdapter } from "./source-resolver.ts"
import { runAsrExtraction } from "./extractors/asr.ts"
import { runOcrExtraction } from "./extractors/ocr.ts"
import { extractSubtitleEvidence } from "./extractors/subtitle.ts"
import { runVisionExtraction } from "./extractors/vision.ts"

type MediaAsset = {
  kind: string
  url: string
}

type ExtractedStageTrace = {
  stage: "raw_text" | "subtitle" | "asr" | "ocr" | "vision"
  attempted: boolean
  used: boolean
  reason: string
  producedChars: number
}

type ExtractMaterialEvidenceInput = {
  sourceId: string
  url: string
  urlIndex: number
  sourceType: "article" | "video" | "image_post"
  title?: string | null
  description?: string | null
  rawTextBlocks: string[]
  subtitleTracks: Array<{ language: string | null; text: string }>
  mediaAssets: MediaAsset[]
  warnings: string[]
  resolvedModels?: MaterialPipelineModels
}

type ExtractMaterialEvidenceResult = {
  chunks: MaterialChunk[]
  warnings: string[]
  extractionTrace: ExtractedStageTrace[]
  coverage: MaterialEvidenceCoverage
}

type RunMaterialIntakeDependencies = {
  resolveMaterialPipelineModels?: typeof resolveMaterialPipelineModels
  runAsrExtraction?: typeof runAsrExtraction
  runOcrExtraction?: typeof runOcrExtraction
  runVisionExtraction?: typeof runVisionExtraction
}

export type MaterialPlanSubmissionInput = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
  sourceDraftId?: string | null
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

function buildRawTextEvidence(
  rawTextBlocks: string[],
): MaterialEvidenceInput[] {
  return rawTextBlocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((content) => ({
      modality: "text" as const,
      evidenceType: "raw_text" as const,
      content,
      confidence: 0.98,
    }))
}

function appendEvidence(
  base: MaterialEvidenceInput[],
  next: MaterialEvidenceInput[],
) {
  if (next.length === 0) {
    return base
  }
  return [...base, ...next]
}

function findVideoAsset(mediaAssets: MediaAsset[]) {
  return mediaAssets.find((asset) => asset.kind === "audio")
    ?? mediaAssets.find((asset) => asset.kind === "video")
    ?? null
}

function findImageAsset(mediaAssets: MediaAsset[]) {
  return mediaAssets.find((asset) => asset.kind.includes("image")) ?? null
}

function measureEvidenceChars(evidence: MaterialEvidenceInput[]) {
  return evidence.reduce((sum, item) => sum + item.content.trim().length, 0)
}

export async function extractMaterialEvidenceForSource(
  input: ExtractMaterialEvidenceInput,
  dependencies: Omit<RunMaterialIntakeDependencies, "resolveMaterialPipelineModels"> = {},
): Promise<ExtractMaterialEvidenceResult> {
  const warnings = [...input.warnings]
  const extractionTrace: ExtractedStageTrace[] = []

  let evidence = buildRawTextEvidence(input.rawTextBlocks)
  extractionTrace.push({
    stage: "raw_text",
    attempted: true,
    used: evidence.length > 0,
    reason: evidence.length > 0 ? "使用公开页可见正文。": "公开页未提取到稳定正文。",
    producedChars: measureEvidenceChars(evidence),
  })

  const subtitleEvidence = extractSubtitleEvidence(input.subtitleTracks)
  evidence = appendEvidence(evidence, subtitleEvidence)
  extractionTrace.push({
    stage: "subtitle",
    attempted: input.subtitleTracks.length > 0,
    used: subtitleEvidence.length > 0,
    reason:
      subtitleEvidence.length > 0
        ? "追加字幕证据。"
        : input.subtitleTracks.length > 0
          ? "字幕为空或不可用。"
          : "来源未提供字幕。",
    producedChars: measureEvidenceChars(subtitleEvidence),
  })

  let chunks = buildChunksFromEvidence(input.url, input.urlIndex, input.sourceId, evidence)
  let coverage = evaluateMaterialEvidenceCoverage(chunks)

  if (!coverage.isSufficient && input.sourceType === "video") {
    const videoAsset = findVideoAsset(input.mediaAssets)
    if (videoAsset) {
      const asrResult = await (dependencies.runAsrExtraction ?? runAsrExtraction)({
        runtime: input.resolvedModels?.asr ?? null,
        mediaAsset: videoAsset,
        title: input.title,
        description: input.description,
      })
      warnings.push(...asrResult.warnings)
      evidence = appendEvidence(evidence, asrResult.evidence)
      extractionTrace.push({
        stage: "asr",
        attempted: true,
        used: asrResult.evidence.length > 0,
        reason: asrResult.evidence.length > 0 ? "正文不足，升级到 ASR。": "ASR 未返回稳定结果。",
        producedChars: measureEvidenceChars(asrResult.evidence),
      })
      chunks = buildChunksFromEvidence(input.url, input.urlIndex, input.sourceId, evidence)
      coverage = evaluateMaterialEvidenceCoverage(chunks)
    } else {
      warnings.push("缺少可用于 ASR 的公开音视频资源，已跳过语音转写。")
      extractionTrace.push({
        stage: "asr",
        attempted: false,
        used: false,
        reason: "无公开 video/audio 资源。",
        producedChars: 0,
      })
    }
  } else {
    extractionTrace.push({
      stage: "asr",
      attempted: false,
      used: false,
      reason:
        input.sourceType === "article"
          ? "图文来源不进入 ASR。"
          : "高优先级证据已足够，跳过 ASR。",
      producedChars: 0,
    })
  }

  if (!coverage.isSufficient && input.sourceType !== "article") {
    const imageAsset = findImageAsset(input.mediaAssets)
    if (imageAsset) {
      const ocrResult = await (dependencies.runOcrExtraction ?? runOcrExtraction)({
        runtime: input.resolvedModels?.vision ?? null,
        mediaAsset: imageAsset,
        title: input.title,
      })
      warnings.push(...ocrResult.warnings)
      evidence = appendEvidence(evidence, ocrResult.evidence)
      extractionTrace.push({
        stage: "ocr",
        attempted: true,
        used: ocrResult.evidence.length > 0,
        reason: ocrResult.evidence.length > 0 ? "正文不足，升级到 OCR。": "OCR 未返回稳定结果。",
        producedChars: measureEvidenceChars(ocrResult.evidence),
      })
      chunks = buildChunksFromEvidence(input.url, input.urlIndex, input.sourceId, evidence)
      coverage = evaluateMaterialEvidenceCoverage(chunks)

      if (!coverage.isSufficient) {
        const visionResult = await (dependencies.runVisionExtraction ?? runVisionExtraction)({
          runtime: input.resolvedModels?.vision ?? null,
          mediaAsset: imageAsset,
          title: input.title,
          description: input.description,
        })
        warnings.push(...visionResult.warnings)
        evidence = appendEvidence(evidence, visionResult.evidence)
        extractionTrace.push({
          stage: "vision",
          attempted: true,
          used: visionResult.evidence.length > 0,
          reason: visionResult.evidence.length > 0 ? "OCR 仍不足，补充 vision 摘要。": "vision 未返回稳定结果。",
          producedChars: measureEvidenceChars(visionResult.evidence),
        })
        chunks = buildChunksFromEvidence(input.url, input.urlIndex, input.sourceId, evidence)
        coverage = evaluateMaterialEvidenceCoverage(chunks)
      } else {
        extractionTrace.push({
          stage: "vision",
          attempted: false,
          used: false,
          reason: "OCR 已提供足够证据，跳过 vision。",
          producedChars: 0,
        })
      }
    } else {
      warnings.push("缺少可用于 OCR/vision 的公开图片资源，已跳过画面提取。")
      extractionTrace.push({
        stage: "ocr",
        attempted: false,
        used: false,
        reason: "无公开图片资源。",
        producedChars: 0,
      })
      extractionTrace.push({
        stage: "vision",
        attempted: false,
        used: false,
        reason: "无公开图片资源。",
        producedChars: 0,
      })
    }
  } else {
    extractionTrace.push({
      stage: "ocr",
      attempted: false,
      used: false,
      reason:
        input.sourceType === "article"
          ? "图文来源不进入 OCR。"
          : "已有足够证据，跳过 OCR。",
      producedChars: 0,
    })
    extractionTrace.push({
      stage: "vision",
      attempted: false,
      used: false,
      reason:
        input.sourceType === "article"
          ? "图文来源不进入 vision。"
          : "已有足够证据，跳过 vision。",
      producedChars: 0,
    })
  }

  if (coverage.isWeakEvidence) {
    warnings.push("材料证据仍偏弱，后续可能自动降级为 3 关试点计划。")
  }

  return {
    chunks,
    warnings: [...new Set(warnings)],
    extractionTrace,
    coverage,
  }
}

export function buildMaterialChunkRows(
  intakeId: string,
  sourceId: string,
  chunks: MaterialChunk[],
  now: string,
) {
  return chunks.map((chunk, index) => ({
    intake_id: intakeId,
    source_id: sourceId,
    chunk_no: index,
    modality: chunk.modality,
    content: chunk.excerpt,
    summary: chunk.excerpt.slice(0, 500),
    source_ref: chunk.sourceRef,
    evidence_type: chunk.evidenceType,
    confidence: chunk.confidence,
    token_estimate: Math.ceil(chunk.excerpt.length / 3),
    created_at: now,
    updated_at: now,
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
      draft_id: input.sourceDraftId ?? null,
      trigger_type: input.sourceDraftId ? "regenerate" : "submit",
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
  dependencies: RunMaterialIntakeDependencies = {},
): Promise<MaterialIntakeResult> {
  const normalizedLinks = normalizeLinks(links)
  const now = new Date().toISOString()
  const resolvedModels = await (dependencies.resolveMaterialPipelineModels ?? resolveMaterialPipelineModels)()

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
      const sourceId = randomUUID()
      const extracted = await extractMaterialEvidenceForSource(
        {
          sourceId,
          url: fetched.canonicalUrl,
          urlIndex: i + 1,
          sourceType: fetched.sourceType,
          title: fetched.title,
          description: fetched.description,
          rawTextBlocks: fetched.rawTextBlocks,
          subtitleTracks: fetched.subtitleTracks,
          mediaAssets: fetched.mediaAssets,
          warnings: fetched.warnings,
          resolvedModels,
        },
        {
          runAsrExtraction: dependencies.runAsrExtraction,
          runOcrExtraction: dependencies.runOcrExtraction,
          runVisionExtraction: dependencies.runVisionExtraction,
        },
      )

      if (extracted.chunks.length === 0) {
        throw materialInsufficientContent()
      }

      const excerpt =
        extracted.chunks.map((chunk) => chunk.excerpt).join("\n\n").slice(0, 2000)
        || fetched.description
        || null

      const metadata = {
        sourceCode: current.adapter.sourceCode,
        warnings: extracted.warnings,
        mediaAssets: fetched.mediaAssets,
        subtitleTracks: fetched.subtitleTracks,
        coverImageUrl: fetched.coverImageUrl,
        authorName: fetched.authorName,
        extractionTrace: extracted.extractionTrace,
        evidenceCoverage: extracted.coverage,
        resolvedModelCodes: {
          asr: resolvedModels.asr?.model.code ?? null,
          vision: resolvedModels.vision?.model.code ?? null,
          quality: resolvedModels.quality?.model.code ?? null,
        },
      }

      const { error: sourceError } = await supabase
        .from("learning_material_sources")
        .insert({
          id: sourceId,
          intake_id: intakeId,
          url: fetched.canonicalUrl,
          source_type: toPersistedSourceType(fetched.sourceType),
          fetch_status: "succeeded",
          title: fetched.title,
          content_excerpt: excerpt,
          token_estimate: Math.ceil(extracted.coverage.totalUsefulChars / 3),
          metadata,
          created_at: now,
          updated_at: now,
        })

      assertSupabaseSuccess(sourceError, "failed to insert material source")

      const chunkRows = buildMaterialChunkRows(intakeId, sourceId, extracted.chunks, now)
      const { error: chunkError } = await supabase
        .from("learning_material_chunks")
        .insert(chunkRows)

      assertSupabaseSuccess(chunkError, "failed to insert material chunks")

      allChunks.push(...extracted.chunks)
      sourceSnapshots.push({
        id: sourceId,
        url: fetched.canonicalUrl,
        sourceType: fetched.sourceType,
        title: fetched.title,
        contentExcerpt: excerpt,
        metadata,
      })
    } catch (error) {
      const message = error instanceof MaterialPlanError ? error.message : "抓取失败"
      const code = error instanceof MaterialPlanError ? error.code : "MATERIAL_FETCH_FAILED"

      const { error: sourceError } = await supabase.from("learning_material_sources").insert({
        id: randomUUID(),
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
