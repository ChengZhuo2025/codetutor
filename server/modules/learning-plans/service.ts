import "server-only"

import { getLearningLevelLabel } from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import { runMaterialIntake } from "@/server/modules/learning-materials/service.ts"

import { confirmPlanDraft, type ConfirmDraftResult } from "./activation.ts"
import {
  aiProviderFailed,
  aiResponseInvalid,
  planDraftAlreadyConfirmed,
  planDraftNotFound,
} from "./errors.ts"
import { extractJsonObjectString } from "./json-parse.ts"
import { invokePlannerModel } from "./planner-runtime.ts"
import { buildPlannerUserMessage } from "./prompt.ts"
import {
  plannerOutputSchema,
  validatePlannerBusinessRules,
  type PlannerOutput,
} from "./schema.ts"

export type PlanFromMaterialInput = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
}

export type PlanDraftRegenerateInput = {
  links?: string[] | null
  userGoal?: string | null
  weeklyHours?: number | null
}

export type PlanFromMaterialResult = {
  processingMode: "sync"
  draftId: string
  intakeId: string
  preview: PlannerOutput
}

function readStringArrayJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

function tryParsePlannerOutput(content: string): PlannerOutput {
  const jsonStr = extractJsonObjectString(content)
  let raw: unknown
  try {
    raw = JSON.parse(jsonStr) as unknown
  } catch {
    throw aiResponseInvalid("模型返回内容不是合法 JSON。")
  }
  const parsed = plannerOutputSchema.safeParse(raw)
  if (!parsed.success) {
    throw aiResponseInvalid(parsed.error.message)
  }
  const biz = validatePlannerBusinessRules(parsed.data)
  if (biz) {
    throw aiResponseInvalid(biz)
  }
  return parsed.data
}

async function invokePlannerWithRetry(userContent: string): Promise<PlannerOutput> {
  const first = await invokePlannerModel(userContent)
  try {
    return tryParsePlannerOutput(first.content)
  } catch {
    const second = await invokePlannerModel(userContent)
    return tryParsePlannerOutput(second.content)
  }
}

async function loadProfileForPlanner(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("primary_tool_id, learning_level")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load profile for planner")
  const profile = profileData as {
    primary_tool_id: string | null
    learning_level: "beginner" | "intermediate" | "advanced"
  } | null

  if (!profile?.primary_tool_id) {
    throw aiResponseInvalid("请先完成新手引导并选择主工具。")
  }

  const { data: toolData, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("id", profile.primary_tool_id)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load tool for planner")
  const tool = toolData as { id: string; code: string; name: string } | null
  if (!tool) {
    throw aiResponseInvalid("主工具不存在。")
  }

  return {
    supabase,
    learningLevelLabel: getLearningLevelLabel(profile.learning_level),
    targetToolName: tool.name,
  }
}

async function persistDraftRow(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  intakeId: string,
  plan: PlannerOutput,
) {
  const now = new Date().toISOString()
  const estimatedTotal = plan.tasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes ?? 0),
    0,
  )

  const { data: draftRow, error: draftError } = await supabase
    .from("learning_plan_drafts")
    .insert({
      user_id: userId,
      intake_id: intakeId,
      title: plan.title.slice(0, 256),
      goal: plan.goal,
      estimated_total_minutes: estimatedTotal > 0 ? estimatedTotal : null,
      status: "draft",
      raw_plan_json: plan,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(draftError, "failed to insert plan draft")
  const draftId = draftRow?.id as string

  const taskRows = plan.tasks.map((t) => ({
    draft_id: draftId,
    task_no: t.taskNo,
    title: t.title.slice(0, 256),
    objective: t.objective,
    practice_steps: t.practiceSteps,
    acceptance_criteria: t.acceptanceCriteria,
    estimated_minutes: t.estimatedMinutes ?? null,
    source_refs: t.sourceRefs,
    metadata: {},
    created_at: now,
    updated_at: now,
  }))

  const { error: tasksError } = await supabase
    .from("learning_plan_draft_tasks")
    .insert(taskRows)

  assertSupabaseSuccess(tasksError, "failed to insert draft tasks")

  return draftId
}

export async function createPlanFromMaterial(
  userId: string,
  input: PlanFromMaterialInput,
): Promise<PlanFromMaterialResult> {
  const { supabase, learningLevelLabel, targetToolName } =
    await loadProfileForPlanner(userId)

  const { intakeId, chunks } = await runMaterialIntake(
    supabase,
    userId,
    input.links,
  )

  const userMessage = buildPlannerUserMessage({
    chunks,
    userGoal: input.userGoal,
    weeklyHours: input.weeklyHours,
    targetToolName,
    learningLevelLabel,
  })

  let plan: PlannerOutput
  try {
    plan = await invokePlannerWithRetry(userMessage)
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw aiProviderFailed(error.message)
    }
    throw error
  }

  const draftId = await persistDraftRow(supabase, userId, intakeId, plan)

  return {
    processingMode: "sync",
    draftId,
    intakeId,
    preview: plan,
  }
}

export async function regeneratePlanDraft(
  userId: string,
  draftId: string,
  input: PlanDraftRegenerateInput,
): Promise<PlanFromMaterialResult> {
  const supabase = createSupabaseAdminClient()

  const { data: existingDraft, error: loadError } = await supabase
    .from("learning_plan_drafts")
    .select("id, user_id, status, intake_id")
    .eq("id", draftId)
    .maybeSingle()

  assertSupabaseSuccess(loadError, "failed to load draft for regenerate")
  const row = existingDraft as {
    id: string
    user_id: string
    status: string
    intake_id: string
  } | null

  if (!row || row.user_id !== userId) {
    throw planDraftNotFound()
  }

  if (row.status !== "draft") {
    throw planDraftAlreadyConfirmed("仅草稿状态可以重新生成。")
  }

  let links = input.links?.filter(Boolean) ?? []
  if (links.length === 0) {
    const { data: intakeRow, error: intakeError } = await supabase
      .from("learning_material_intakes")
      .select("input_links")
      .eq("id", row.intake_id)
      .maybeSingle()

    assertSupabaseSuccess(intakeError, "failed to load intake links")
    links = readStringArrayJson(
      (intakeRow as { input_links: unknown } | null)?.input_links,
    )
  }

  if (links.length === 0) {
    throw aiResponseInvalid("缺少有效教程链接。")
  }

  const { learningLevelLabel, targetToolName } =
    await loadProfileForPlanner(userId)

  const { intakeId, chunks } = await runMaterialIntake(supabase, userId, links)

  const userMessage = buildPlannerUserMessage({
    chunks,
    userGoal: input.userGoal,
    weeklyHours: input.weeklyHours,
    targetToolName,
    learningLevelLabel,
  })

  let plan: PlannerOutput
  try {
    plan = await invokePlannerWithRetry(userMessage)
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw aiProviderFailed(error.message)
    }
    throw error
  }

  const newDraftId = await persistDraftRow(supabase, userId, intakeId, plan)

  const now = new Date().toISOString()
  const { error: supersedeError } = await supabase
    .from("learning_plan_drafts")
    .update({
      status: "superseded",
      superseded_by_draft_id: newDraftId,
      updated_at: now,
    })
    .eq("id", draftId)
    .eq("user_id", userId)
    .eq("status", "draft")

  assertSupabaseSuccess(supersedeError, "failed to supersede old draft")

  return {
    processingMode: "sync",
    draftId: newDraftId,
    intakeId,
    preview: plan,
  }
}

export async function confirmPlanDraftForUser(
  userId: string,
  draftId: string,
): Promise<ConfirmDraftResult> {
  return confirmPlanDraft(userId, draftId)
}
