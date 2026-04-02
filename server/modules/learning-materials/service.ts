import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

import { MATERIAL_PLAN_MAX_LINKS } from "./constants.ts"
import { MaterialPlanError, materialFetchFailed } from "./errors.ts"
import { fetchArticleText } from "./extractors/article.ts"
import { buildChunks, summarizeChunks, type MaterialChunk } from "./normalizer.ts"
import { assertHostnameAllowed } from "./whitelist.ts"

export type MaterialIntakeResult = {
  intakeId: string
  chunks: MaterialChunk[]
  summary: string
}

export async function runMaterialIntake(
  supabase: SupabaseClient,
  userId: string,
  links: string[],
): Promise<MaterialIntakeResult> {
  if (links.length === 0 || links.length > MATERIAL_PLAN_MAX_LINKS) {
    throw new MaterialPlanError(
      "VALIDATION_FAILED",
      `links 数量必须在 1 到 ${MATERIAL_PLAN_MAX_LINKS} 之间。`,
      422,
    )
  }

  const normalizedLinks = [...new Set(links.map((l) => l.trim()).filter(Boolean))]
  if (normalizedLinks.length === 0) {
    throw new MaterialPlanError("VALIDATION_FAILED", "links 不能为空。", 422)
  }

  for (const link of normalizedLinks) {
    assertHostnameAllowed(link)
  }

  const now = new Date().toISOString()
  const { data: intakeRow, error: intakeInsertError } = await supabase
    .from("learning_material_intakes")
    .insert({
      user_id: userId,
      status: "processing",
      input_links: normalizedLinks,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(intakeInsertError, "failed to insert material intake")
  const intakeId = intakeRow?.id as string

  const allChunks: MaterialChunk[] = []

  for (let i = 0; i < normalizedLinks.length; i += 1) {
    const url = normalizedLinks[i]!
    try {
      const { title, text } = await fetchArticleText(url)
      const chunks = buildChunks(url, text, i + 1)
      allChunks.push(...chunks)

      const { error: sourceError } = await supabase.from("learning_material_sources").insert({
        intake_id: intakeId,
        url,
        source_type: "article",
        fetch_status: "succeeded",
        title,
        content_excerpt: text.slice(0, 2000),
        token_estimate: Math.ceil(text.length / 3),
        metadata: {},
        created_at: now,
        updated_at: now,
      })
      assertSupabaseSuccess(sourceError, "failed to insert material source")
    } catch (error) {
      const message = error instanceof MaterialPlanError ? error.message : "抓取失败"
      const code = error instanceof MaterialPlanError ? error.code : "MATERIAL_FETCH_FAILED"
      const { error: sourceError } = await supabase.from("learning_material_sources").insert({
        intake_id: intakeId,
        url,
        source_type: "article",
        fetch_status: "failed",
        title: null,
        content_excerpt: null,
        token_estimate: null,
        metadata: { error: message, code },
        created_at: now,
        updated_at: now,
      })
      assertSupabaseSuccess(sourceError, "failed to insert failed material source")
    }
  }

  if (allChunks.length === 0) {
    const { error: failIntake } = await supabase
      .from("learning_material_intakes")
      .update({
        status: "failed",
        error_code: "MATERIAL_FETCH_FAILED",
        normalized_summary: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    assertSupabaseSuccess(failIntake, "failed to mark intake failed")
    throw materialFetchFailed()
  }

  const summary = summarizeChunks(allChunks)
  const { error: okIntake } = await supabase
    .from("learning_material_intakes")
    .update({
      status: "succeeded",
      normalized_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  assertSupabaseSuccess(okIntake, "failed to finalize intake")

  return {
    intakeId,
    chunks: allChunks,
    summary,
  }
}
