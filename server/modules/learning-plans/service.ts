import "server-only"

import { z } from "zod"
import { getLearningLevelLabel } from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import { kickMaterialPlanRun, registerMaterialPlanRunExecutor } from "@/server/modules/learning-materials/queue.ts"
import {
  runMaterialIntake,
  submitMaterialPlanGeneration,
  type MaterialPlanSubmissionResult,
} from "@/server/modules/learning-materials/service.ts"

import { confirmPlanDraft, type ConfirmDraftResult } from "./activation.ts"
import {
  aiProviderFailed,
  aiResponseInvalid,
  materialIntakeNotFound,
  planDraftAlreadyConfirmed,
  planDraftNotFound,
} from "./errors.ts"
import { extractJsonObjectString } from "./json-parse.ts"
import { invokePlannerModel } from "./planner-runtime.ts"
import { buildPlannerUserMessage } from "./prompt.ts"
import { runPlanQualityGate } from "./quality-gate.ts"
import {
  plannerTaskSchema,
  plannerOutputSchema,
  validatePlannerBusinessRules,
  type PlannerOutput,
} from "./schema.ts"

export type PlanFromMaterialInput = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}

export type PlanDraftRegenerateInput = {
  links?: string[] | null
  userGoal?: string | null
  weeklyHours?: number | null
}

export type PlanDraftTaskPatchInput = {
  id: string
  title?: string | null
  objective?: string | null
  practiceSteps?: string[]
  acceptanceCriteria?: string | null
  estimatedMinutes?: number | null
  recommendedForWeek1?: boolean
}

export type PlanDraftPatchInput = {
  title?: string | null
  goal?: string | null
  tasks?: PlanDraftTaskPatchInput[]
}

export type PlanFromMaterialResult = MaterialPlanSubmissionResult | {
  processingMode: "async"
  intakeId: string
  runId: string
  draftId: string | null
  status: "extracting" | "planning" | "quality_checking" | "ready" | "failed"
}

export type PlanDraftDetailResult = {
  draftId: string
  intakeId: string
  title: string
  goal: string | null
  status: "draft" | "confirmed" | "rejected" | "superseded"
  revisionNo: number
  qualityStatus: string
  qualityReport: Record<string, unknown> | null
  alignmentTable: unknown
  week1TaskIds: string[]
  updatedAt: string
  tasks: Array<{
    id: string
    taskNo: number
    position: number | null
    title: string
    objective: string
    practiceSteps: string[]
    acceptanceCriteria: string
    estimatedMinutes: number | null
    sourceRefs: string[]
    goalAlignmentRefs: string[]
    recommendedForWeek1: boolean
    isUserEdited: boolean
  }>
}

type GenerationRunRow = {
  id: string
  user_id: string
  intake_id: string
  draft_id: string | null
  status: string
  planner_input: {
    userGoal?: string | null
    weeklyHours?: number | null
    currentConstraints?: string | null
  } | null
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
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
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
      alignment_json: plan.alignmentTable,
      week_1_task_ids: [],
      editable_payload: {
        title: plan.title,
        goal: plan.goal,
        alignmentTable: plan.alignmentTable,
        warnings: plan.warnings,
        week1TaskNos: plan.week1TaskNos,
        tasks: plan.tasks,
      },
      quality_status: "pending",
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(draftError, "failed to insert plan draft")
  const draftId = draftRow?.id as string

  const taskRows = plan.tasks.map((task) => ({
    draft_id: draftId,
    task_no: task.taskNo,
    position: task.taskNo,
    title: task.title.slice(0, 256),
    objective: task.objective,
    practice_steps: task.practiceSteps,
    acceptance_criteria: task.acceptanceCriteria,
    estimated_minutes: task.estimatedMinutes ?? null,
    source_refs: task.sourceRefs,
    goal_alignment_refs: task.goalAlignmentRefs,
    recommended_for_week_1: plan.week1TaskNos.includes(task.taskNo),
    metadata: {},
    created_at: now,
    updated_at: now,
  }))

  const { data: insertedTasks, error: tasksError } = await supabase
    .from("learning_plan_draft_tasks")
    .insert(taskRows)
    .select("id, task_no")

  assertSupabaseSuccess(tasksError, "failed to insert draft tasks")

  const week1TaskIds = ((insertedTasks ?? []) as Array<{ id: string; task_no: number }>)
    .filter((task) => plan.week1TaskNos.includes(task.task_no))
    .map((task) => task.id)

  const { error: patchDraftError } = await supabase
    .from("learning_plan_drafts")
    .update({
      week_1_task_ids: week1TaskIds,
      updated_at: now,
    })
    .eq("id", draftId)

  assertSupabaseSuccess(patchDraftError, "failed to patch draft week_1_task_ids")

  return draftId
}

async function loadDraftRowForUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  draftId: string,
) {
  const { data: draftData, error: draftError } = await supabase
    .from("learning_plan_drafts")
    .select(
      "id, user_id, intake_id, title, goal, status, revision_no, quality_status, quality_report, alignment_json, week_1_task_ids, updated_at",
    )
    .eq("id", draftId)
    .maybeSingle()

  assertSupabaseSuccess(draftError, "failed to load plan draft detail")

  const draft = draftData as {
    id: string
    user_id: string
    intake_id: string
    title: string
    goal: string | null
    status: "draft" | "confirmed" | "rejected" | "superseded"
    revision_no: number
    quality_status: string
    quality_report: Record<string, unknown> | null
    alignment_json: unknown
    week_1_task_ids: unknown
    updated_at: string
  } | null

  if (!draft || draft.user_id !== userId) {
    throw planDraftNotFound()
  }

  return draft
}

async function loadDraftTasks(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  draftId: string,
) {
  const { data: taskRows, error: taskError } = await supabase
    .from("learning_plan_draft_tasks")
    .select(
      "id, task_no, position, title, objective, practice_steps, acceptance_criteria, estimated_minutes, source_refs, goal_alignment_refs, recommended_for_week_1, is_user_edited",
    )
    .eq("draft_id", draftId)
    .order("task_no", { ascending: true })

  assertSupabaseSuccess(taskError, "failed to load draft tasks")

  return (taskRows ?? []) as Array<{
    id: string
    task_no: number
    position: number | null
    title: string
    objective: string
    practice_steps: unknown
    acceptance_criteria: string
    estimated_minutes: number | null
    source_refs: unknown
    goal_alignment_refs: unknown
    recommended_for_week_1: boolean
    is_user_edited: boolean
  }>
}

function toDraftDetailResult(
  draft: Awaited<ReturnType<typeof loadDraftRowForUser>>,
  tasks: Awaited<ReturnType<typeof loadDraftTasks>>,
): PlanDraftDetailResult {
  return {
    draftId: draft.id,
    intakeId: draft.intake_id,
    title: draft.title,
    goal: draft.goal,
    status: draft.status,
    revisionNo: draft.revision_no,
    qualityStatus: draft.quality_status,
    qualityReport: draft.quality_report,
    alignmentTable: draft.alignment_json,
    week1TaskIds: readStringArrayJson(draft.week_1_task_ids),
    updatedAt: draft.updated_at,
    tasks: tasks.map((task) => ({
      id: task.id,
      taskNo: task.task_no,
      position: task.position,
      title: task.title,
      objective: task.objective,
      practiceSteps: readStringArrayJson(task.practice_steps),
      acceptanceCriteria: task.acceptance_criteria,
      estimatedMinutes: task.estimated_minutes,
      sourceRefs: readStringArrayJson(task.source_refs),
      goalAlignmentRefs: readStringArrayJson(task.goal_alignment_refs),
      recommendedForWeek1: task.recommended_for_week_1,
      isUserEdited: task.is_user_edited,
    })),
  }
}

function buildRawPlanFromDraftDetail(detail: PlanDraftDetailResult): PlannerOutput {
  return {
    title: detail.title,
    goal: detail.goal ?? detail.title,
    alignmentTable: Array.isArray(detail.alignmentTable) ? detail.alignmentTable as Array<Record<string, unknown>> : [],
    estimatedTotalMinutes: detail.tasks.reduce(
      (sum, task) => sum + (task.estimatedMinutes ?? 0),
      0,
    ),
    week1TaskNos: detail.tasks.filter((task) => task.recommendedForWeek1).map((task) => task.taskNo),
    warnings: [],
    tasks: detail.tasks.map((task) => ({
      taskNo: task.taskNo,
      title: task.title,
      objective: task.objective,
      practiceSteps: task.practiceSteps,
      acceptanceCriteria: task.acceptanceCriteria,
      estimatedMinutes: task.estimatedMinutes ?? undefined,
      sourceRefs: task.sourceRefs,
      goalAlignmentRefs: task.goalAlignmentRefs,
    })),
  }
}

export async function createPlanFromMaterial(
  userId: string,
  input: PlanFromMaterialInput,
): Promise<PlanFromMaterialResult> {
  const supabase = createSupabaseAdminClient()
  const result = await submitMaterialPlanGeneration(supabase, userId, input)
  kickMaterialPlanRun(result.runId)
  return result
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

  return createPlanFromMaterial(userId, {
    links,
    userGoal: input.userGoal,
    weeklyHours: input.weeklyHours,
  })
}

export async function confirmPlanDraftForUser(
  userId: string,
  draftId: string,
): Promise<ConfirmDraftResult> {
  return confirmPlanDraft(userId, draftId)
}

export async function getPlanDraftDetailForUser(
  userId: string,
  draftId: string,
): Promise<PlanDraftDetailResult> {
  const supabase = createSupabaseAdminClient()
  const draft = await loadDraftRowForUser(supabase, userId, draftId)
  const tasks = await loadDraftTasks(supabase, draftId)
  return toDraftDetailResult(draft, tasks)
}

export async function updatePlanDraftForUser(
  userId: string,
  draftId: string,
  input: PlanDraftPatchInput,
): Promise<PlanDraftDetailResult> {
  const supabase = createSupabaseAdminClient()
  const draft = await loadDraftRowForUser(supabase, userId, draftId)
  if (draft.status !== "draft") {
    throw planDraftAlreadyConfirmed("仅草稿状态可以编辑。")
  }

  const currentTasks = await loadDraftTasks(supabase, draftId)
  const patchMap = new Map((input.tasks ?? []).map((task) => [task.id, task]))
  const now = new Date().toISOString()
  const nextRevisionNo = draft.revision_no + 1

  for (const task of currentTasks) {
    const patch = patchMap.get(task.id)
    if (!patch) {
      continue
    }

    const { error: taskUpdateError } = await supabase
      .from("learning_plan_draft_tasks")
      .update({
        title: patch.title ?? task.title,
        objective: patch.objective ?? task.objective,
        practice_steps: patch.practiceSteps ?? task.practice_steps,
        acceptance_criteria: patch.acceptanceCriteria ?? task.acceptance_criteria,
        estimated_minutes:
          patch.estimatedMinutes !== undefined ? patch.estimatedMinutes : task.estimated_minutes,
        recommended_for_week_1:
          patch.recommendedForWeek1 !== undefined
            ? patch.recommendedForWeek1
            : task.recommended_for_week_1,
        is_user_edited: true,
        updated_at: now,
      })
      .eq("id", task.id)
      .eq("draft_id", draftId)

    assertSupabaseSuccess(taskUpdateError, "failed to update draft task")
  }

  const refreshedTasks = await loadDraftTasks(supabase, draftId)
  const baseDetail = toDraftDetailResult(draft, refreshedTasks)
  const nextDetail: PlanDraftDetailResult = {
    ...baseDetail,
    title: input.title !== undefined ? (input.title ?? draft.title) : draft.title,
    goal: input.goal !== undefined ? input.goal : draft.goal,
    revisionNo: nextRevisionNo,
    qualityStatus: "pending",
    qualityReport: null,
    week1TaskIds: refreshedTasks
      .filter((task) => task.recommended_for_week_1)
      .map((task) => task.id),
    updatedAt: now,
  }

  const nextRawPlan = buildRawPlanFromDraftDetail(nextDetail)

  const { error: draftUpdateError } = await supabase
    .from("learning_plan_drafts")
    .update({
      title: nextDetail.title,
      goal: nextDetail.goal,
      raw_plan_json: nextRawPlan,
      editable_payload: {
        title: nextDetail.title,
        goal: nextDetail.goal,
        tasks: nextDetail.tasks,
      },
      week_1_task_ids: nextDetail.week1TaskIds,
      revision_no: nextRevisionNo,
      quality_status: "pending",
      quality_report: null,
      updated_at: now,
    })
    .eq("id", draftId)

  assertSupabaseSuccess(draftUpdateError, "failed to update plan draft")

  const { error: revisionError } = await supabase
    .from("learning_plan_draft_revisions")
    .insert({
      draft_id: draftId,
      revision_no: nextRevisionNo,
      change_type: "user_patch",
      patch_payload: input,
      created_by: userId,
      created_at: now,
    })

  assertSupabaseSuccess(revisionError, "failed to insert draft revision")

  return getPlanDraftDetailForUser(userId, draftId)
}

function buildTaskRegenerationUserMessage(input: {
  draft: PlanDraftDetailResult
  targetTaskId: string
  chunks: Array<{ id: string; content: string }>
}) {
  const targetTask = input.draft.tasks.find((task) => task.id === input.targetTaskId)
  if (!targetTask) {
    throw planDraftNotFound("草稿任务不存在。")
  }

  const parts: string[] = []
  parts.push("请仅返回一个 JSON 对象，字段必须满足单任务契约。")
  parts.push(`计划标题：${input.draft.title}`)
  parts.push(`计划目标：${input.draft.goal ?? "无"}`)
  parts.push(`要重生成的 taskNo：${targetTask.taskNo}`)
  parts.push(`当前任务标题：${targetTask.title}`)
  parts.push(`当前任务目标：${targetTask.objective}`)
  parts.push("现有任务列表：")
  for (const task of input.draft.tasks) {
    parts.push(`- ${task.taskNo}. ${task.title}｜${task.objective}`)
  }
  parts.push("材料证据分块：")
  for (const chunk of input.chunks) {
    parts.push(`### ${chunk.id}\n${chunk.content}`)
  }
  parts.push("要求：保留相同 taskNo；sourceRefs 只能引用上面的 chunk id；输出更具体、可执行。")
  return parts.join("\n")
}

function tryParsePlannerTask(content: string, expectedTaskNo: number) {
  const jsonStr = extractJsonObjectString(content)
  const raw = JSON.parse(jsonStr) as unknown
  const parsed = plannerTaskSchema.safeParse(raw)
  if (!parsed.success) {
    throw aiResponseInvalid(parsed.error.message)
  }

  return {
    ...parsed.data,
    taskNo: expectedTaskNo,
  }
}

async function invokeTaskRegenerationWithRetry(userContent: string, expectedTaskNo: number) {
  const first = await invokePlannerModel(userContent)
  try {
    return tryParsePlannerTask(first.content, expectedTaskNo)
  } catch {
    const second = await invokePlannerModel(userContent)
    return tryParsePlannerTask(second.content, expectedTaskNo)
  }
}

export async function regeneratePlanDraftTaskForUser(
  userId: string,
  draftId: string,
  taskId: string,
): Promise<PlanDraftDetailResult> {
  const supabase = createSupabaseAdminClient()
  const draft = await getPlanDraftDetailForUser(userId, draftId)
  if (draft.status !== "draft") {
    throw planDraftAlreadyConfirmed("仅草稿状态可以重生成任务。")
  }

  const targetTask = draft.tasks.find((task) => task.id === taskId)
  if (!targetTask) {
    throw planDraftNotFound("草稿任务不存在。")
  }

  const { data: chunkRows, error: chunkError } = await supabase
    .from("learning_material_chunks")
    .select("id, content")
    .eq("intake_id", draft.intakeId)
    .order("chunk_no", { ascending: true })
    .limit(6)

  assertSupabaseSuccess(chunkError, "failed to load material chunks for task regenerate")
  const chunks = (chunkRows ?? []) as Array<{ id: string; content: string }>
  if (chunks.length === 0) {
    throw aiResponseInvalid("缺少可用于重生成任务的材料分块。")
  }

  const userMessage = buildTaskRegenerationUserMessage({
    draft,
    targetTaskId: taskId,
    chunks,
  })

  let regeneratedTask: z.infer<typeof plannerTaskSchema>
  try {
    regeneratedTask = await invokeTaskRegenerationWithRetry(userMessage, targetTask.taskNo)
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw aiProviderFailed(error.message)
    }
    throw error
  }

  const now = new Date().toISOString()
  const nextRevisionNo = draft.revisionNo + 1

  const { error: taskUpdateError } = await supabase
    .from("learning_plan_draft_tasks")
    .update({
      title: regeneratedTask.title,
      objective: regeneratedTask.objective,
      practice_steps: regeneratedTask.practiceSteps,
      acceptance_criteria: regeneratedTask.acceptanceCriteria,
      estimated_minutes: regeneratedTask.estimatedMinutes ?? null,
      source_refs: regeneratedTask.sourceRefs,
      is_user_edited: false,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("draft_id", draftId)

  assertSupabaseSuccess(taskUpdateError, "failed to update regenerated task")

  const refreshedDraft = await getPlanDraftDetailForUser(userId, draftId)
  const nextRawPlan = buildRawPlanFromDraftDetail({
    ...refreshedDraft,
    revisionNo: nextRevisionNo,
    qualityStatus: "pending",
    qualityReport: null,
    updatedAt: now,
  })

  const { error: draftUpdateError } = await supabase
    .from("learning_plan_drafts")
    .update({
      raw_plan_json: nextRawPlan,
      editable_payload: {
        title: refreshedDraft.title,
        goal: refreshedDraft.goal,
        tasks: refreshedDraft.tasks,
      },
      revision_no: nextRevisionNo,
      quality_status: "pending",
      quality_report: null,
      updated_at: now,
    })
    .eq("id", draftId)

  assertSupabaseSuccess(draftUpdateError, "failed to update regenerated draft snapshot")

  const { error: revisionError } = await supabase
    .from("learning_plan_draft_revisions")
    .insert({
      draft_id: draftId,
      revision_no: nextRevisionNo,
      change_type: "task_regenerate",
      patch_payload: {
        taskId,
        taskNo: targetTask.taskNo,
      },
      created_by: userId,
      created_at: now,
    })

  assertSupabaseSuccess(revisionError, "failed to insert task regenerate revision")

  return getPlanDraftDetailForUser(userId, draftId)
}

function getFailureInfo(error: unknown) {
  if (error instanceof Error) {
    const maybeCode = (error as { code?: string }).code
    return {
      code: typeof maybeCode === "string" ? maybeCode : "INTERNAL_ERROR",
      message: error.message,
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "未知错误",
  }
}

async function updateRunAndIntakeProgress(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  runId: string,
  intakeId: string,
  input: {
    status: "extracting" | "planning" | "quality_checking" | "ready" | "failed"
    processingStage: string
    progressPercent: number
    progressMessage: string
    extraRunFields?: Record<string, unknown>
    extraIntakeFields?: Record<string, unknown>
  },
) {
  const now = new Date().toISOString()
  const { error: runError } = await supabase
    .from("learning_plan_generation_runs")
    .update({
      status: input.status,
      updated_at: now,
      ...input.extraRunFields,
    })
    .eq("id", runId)

  assertSupabaseSuccess(runError, "failed to update material plan run progress")

  const { error: intakeError } = await supabase
    .from("learning_material_intakes")
    .update({
      status: input.status,
      processing_stage: input.processingStage,
      progress_percent: input.progressPercent,
      progress_message: input.progressMessage,
      updated_at: now,
      ...input.extraIntakeFields,
    })
    .eq("id", intakeId)

  assertSupabaseSuccess(intakeError, "failed to update material intake progress")
}

export async function executeMaterialPlanGenerationRun(runId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: runData, error: runError } = await supabase
    .from("learning_plan_generation_runs")
    .select("id, user_id, intake_id, draft_id, status, planner_input")
    .eq("id", runId)
    .maybeSingle()

  assertSupabaseSuccess(runError, "failed to load material plan generation run")
  const run = runData as GenerationRunRow | null

  if (!run) {
    throw materialIntakeNotFound("生成任务不存在。")
  }

  if (run.status === "ready" || run.status === "failed") {
    return
  }

  const { data: intakeData, error: intakeError } = await supabase
    .from("learning_material_intakes")
    .select("id, input_links")
    .eq("id", run.intake_id)
    .maybeSingle()

  assertSupabaseSuccess(intakeError, "failed to load intake for material generation run")
  const intake = intakeData as { id: string; input_links: unknown } | null
  if (!intake) {
    throw materialIntakeNotFound()
  }

  const links = readStringArrayJson(intake.input_links)
  const plannerInput = run.planner_input ?? null
  const startedAt = new Date().toISOString()

  try {
    await updateRunAndIntakeProgress(supabase, run.id, run.intake_id, {
      status: "extracting",
      processingStage: "extracting",
      progressPercent: 15,
      progressMessage: "正在提取教程内容",
      extraRunFields: {
        started_at: startedAt,
      },
    })

    const { chunks, summary, sourceSnapshots } = await runMaterialIntake(
      supabase,
      run.intake_id,
      links,
    )

    await updateRunAndIntakeProgress(supabase, run.id, run.intake_id, {
      status: "planning",
      processingStage: "planning",
      progressPercent: 55,
      progressMessage: "正在生成学习计划草稿",
      extraRunFields: {
        source_snapshot: {
          links,
          sources: sourceSnapshots,
          summary,
        },
      },
      extraIntakeFields: {
        normalized_summary: summary,
      },
    })

    const { learningLevelLabel, targetToolName } =
      await loadProfileForPlanner(run.user_id)

    const userMessage = buildPlannerUserMessage({
      chunks,
      userGoal: plannerInput?.userGoal ?? null,
      weeklyHours: plannerInput?.weeklyHours ?? null,
      currentConstraints: plannerInput?.currentConstraints ?? null,
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

    await updateRunAndIntakeProgress(supabase, run.id, run.intake_id, {
      status: "quality_checking",
      processingStage: "quality_checking",
      progressPercent: 85,
      progressMessage: "正在校验计划质量",
      extraRunFields: {
        planner_output: plan,
      },
    })

    const qualityGateResult = runPlanQualityGate(plan)
    const finalPlan = qualityGateResult.plan

    const draftId = await persistDraftRow(supabase, run.user_id, run.intake_id, finalPlan)

    const { error: revisionError } = await supabase
      .from("learning_plan_draft_revisions")
      .insert({
        draft_id: draftId,
        revision_no: 1,
        change_type: "initial_generation",
        patch_payload: {
          plan: finalPlan,
        },
        generated_by_run_id: run.id,
        created_by: run.user_id,
        created_at: new Date().toISOString(),
      })

    assertSupabaseSuccess(revisionError, "failed to insert initial draft revision")

    const { error: finalizeDraftError } = await supabase
      .from("learning_plan_drafts")
      .update({
        quality_status: qualityGateResult.qualityStatus,
        quality_report: qualityGateResult.qualityReport,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)

    assertSupabaseSuccess(finalizeDraftError, "failed to finalize draft quality report")

    await updateRunAndIntakeProgress(supabase, run.id, run.intake_id, {
      status: "ready",
      processingStage: "ready",
      progressPercent: 100,
      progressMessage: "草稿已生成，可进入编辑与确认",
      extraRunFields: {
        draft_id: draftId,
        planner_output: finalPlan,
        quality_report: qualityGateResult.qualityReport,
        finished_at: new Date().toISOString(),
      },
      extraIntakeFields: {
        latest_draft_id: draftId,
      },
    })
  } catch (error) {
    const failure = getFailureInfo(error)
    const finishedAt = new Date().toISOString()

    const { error: finalizeRunError } = await supabase
      .from("learning_plan_generation_runs")
      .update({
        status: "failed",
        error_code: failure.code,
        error_message: failure.message,
        finished_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq("id", run.id)

    assertSupabaseSuccess(finalizeRunError, "failed to mark generation run failed")

    const { error: finalizeIntakeError } = await supabase
      .from("learning_material_intakes")
      .update({
        status: "failed",
        processing_stage: "failed",
        progress_percent: 100,
        progress_message: failure.message,
        error_code: failure.code,
        updated_at: finishedAt,
      })
      .eq("id", run.intake_id)

    assertSupabaseSuccess(finalizeIntakeError, "failed to mark intake failed")
  }
}

registerMaterialPlanRunExecutor(async (runId) => {
  await executeMaterialPlanGenerationRun(runId)
})
