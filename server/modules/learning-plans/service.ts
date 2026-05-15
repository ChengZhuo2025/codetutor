import "server-only"

import { z } from "zod"
import { getLearningLevelLabel } from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, runSupabaseQueryWithRetry } from "@/server/lib/supabase"
import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import {
  claimMaterialPlanRun,
  kickMaterialPlanRun,
  registerMaterialPlanRunExecutor,
} from "@/server/modules/learning-materials/queue.ts"
import {
  runMaterialIntake,
  submitMaterialPlanGeneration,
  type MaterialPlanSubmissionResult,
} from "@/server/modules/learning-materials/service.ts"
import {
  resolveMaterialPipelineModels,
  type MaterialPipelineRuntime,
} from "@/server/modules/learning-materials/providers.ts"
import type { MaterialEvidenceCoverage } from "@/server/modules/learning-materials/normalizer.ts"

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
import { analyzePlannerSourceStructure } from "./source-structure.ts"
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
  sourceDraftId?: string | null
}

export type PlanDraftRegenerateInput = {
  links?: string[] | null
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}

export type PlanDraftTaskPatchInput = {
  id: string
  title?: string | null
  objective?: string | null
  lessonBrief?: string | null
  practiceSteps?: string[]
  submissionGuide?: string | null
  checkpoints?: string[]
  acceptanceCriteria?: string | null
  estimatedMinutes?: number | null
  masteryPoints?: string[]
  cautions?: Array<{ text: string; isTrap?: boolean }>
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
  inputContext: {
    links: string[]
    userGoal: string | null
    weeklyHours: number | null
    currentConstraints: string | null
  }
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
    lessonBrief: string
    practiceSteps: string[]
    submissionGuide: string
    checkpoints: string[]
    acceptanceCriteria: string
    estimatedMinutes: number | null
    sourceRefs: string[]
    goalAlignmentRefs: string[]
    masteryPoints: string[]
    cautions: Array<{ text: string; isTrap?: boolean }>
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

type DraftInputContext = PlanDraftDetailResult["inputContext"]

type DraftQualityGateContext = {
  intakeWarnings: string[]
  evidenceCoverage: MaterialEvidenceCoverage | null
  qualityRuntime: MaterialPipelineRuntime | null
}

function readStringArrayJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

function readCautionItemsJson(value: unknown): Array<{ text: string; isTrap?: boolean }> {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null
      }

      const record = item as Record<string, unknown>
      if (typeof record.text !== "string") {
        return null
      }

      return {
        text: record.text,
        ...(typeof record.isTrap === "boolean" ? { isTrap: record.isTrap } : {}),
      }
    })
    .filter((item): item is { text: string; isTrap?: boolean } => Boolean(item))
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function defaultSubmissionGuide() {
  return "完成后把你的产出、截图、代码、终端输出或报错信息发给 AI 教练。"
}

function assertDraftTasksHaveSupplementalContent(tasks: Array<{
  taskNo: number
  masteryPoints: string[]
  cautions: Array<{ text: string; isTrap?: boolean }>
}>) {
  for (const task of tasks) {
    const masteryPoints = task.masteryPoints
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    if (masteryPoints.length < 2) {
      throw aiResponseInvalid(`第 ${task.taskNo} 关“本关要掌握”至少保留 2 条。`)
    }

    const cautions = task.cautions
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text.length > 0)
    if (cautions.length < 1) {
      throw aiResponseInvalid(`第 ${task.taskNo} 关“注意事项”至少保留 1 条。`)
    }
  }
}

function readWarningsFromMetadata(value: unknown) {
  if (!value || typeof value !== "object") {
    return [] as string[]
  }

  const warnings = (value as { warnings?: unknown }).warnings
  return Array.isArray(warnings)
    ? warnings.filter((item): item is string => typeof item === "string")
    : []
}

function readStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readIntegerOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function readStringArrayFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : []
}

function buildLegacyTaskLessonBrief(task: Record<string, unknown>) {
  const objective = readStringOrNull(task.objective)
  const steps = readStringArrayFromRecord(task, "practiceSteps")
  const acceptanceCriteria = readStringOrNull(task.acceptanceCriteria)
  const basis = [
    objective ? `本关先围绕“${objective}”建立操作方法。` : "本关先把教程内容转成一个可执行的小练习。",
    steps.length > 0 ? `开始前先看清要做的动作：${steps.slice(0, 3).join("、")}。` : "开始前先确认目标、操作入口和成功标准。",
    acceptanceCriteria ? `做的过程中用“${acceptanceCriteria}”判断是否达标。` : "做的过程中不要只看感觉，要用可提交证据判断是否达标。",
  ].join("")

  return basis.slice(0, 4000)
}

function buildLegacyTaskSubmissionGuide(task: Record<string, unknown>) {
  const acceptanceCriteria = readStringOrNull(task.acceptanceCriteria)
  return acceptanceCriteria
    ? `提交截图、代码片段、终端输出或文字说明，证明你已经达到：${acceptanceCriteria}`
    : defaultSubmissionGuide()
}

function buildLegacyTaskCheckpoints(task: Record<string, unknown>) {
  const steps = readStringArrayFromRecord(task, "practiceSteps")
  const acceptanceCriteria = readStringOrNull(task.acceptanceCriteria)
  const checkpoints = [
    steps[0] ? `能说明或展示已完成操作：${steps[0]}` : "提交内容能说明本关已完成实际操作。",
    acceptanceCriteria ? `提交证据能对应验收标准：${acceptanceCriteria}` : "提交内容包含截图、代码、终端输出或文字说明等可检查证据。",
    steps[1] ? `能说明或展示已完成操作：${steps[1]}` : null,
  ].filter((item): item is string => Boolean(item))

  return [...new Set(checkpoints)].slice(0, 8)
}

function upgradeLegacyPlannerOutput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw
  }

  const output = raw as Record<string, unknown>
  if (!Array.isArray(output.tasks)) {
    return raw
  }

  return {
    ...output,
    tasks: output.tasks.map((task) => {
      if (!task || typeof task !== "object" || Array.isArray(task)) {
        return task
      }

      const record = task as Record<string, unknown>
      return {
        ...record,
        lessonBrief: readStringOrNull(record.lessonBrief) ?? buildLegacyTaskLessonBrief(record),
        submissionGuide: readStringOrNull(record.submissionGuide) ?? buildLegacyTaskSubmissionGuide(record),
        checkpoints:
          readStringArrayFromRecord(record, "checkpoints").length > 0
            ? readStringArrayFromRecord(record, "checkpoints")
            : buildLegacyTaskCheckpoints(record),
      }
    }),
  }
}

function aggregateCoverageFromSourceSnapshots(
  snapshots: Array<{ metadata: Record<string, unknown> }>,
): MaterialEvidenceCoverage | null {
  const coverageItems = snapshots
    .map((snapshot) => snapshot.metadata.evidenceCoverage)
    .filter((item): item is MaterialEvidenceCoverage => (
      !!item && typeof item === "object"
      && typeof (item as { highConfidenceChars?: unknown }).highConfidenceChars === "number"
      && typeof (item as { totalUsefulChars?: unknown }).totalUsefulChars === "number"
      && typeof (item as { chunkCount?: unknown }).chunkCount === "number"
      && typeof (item as { isSufficient?: unknown }).isSufficient === "boolean"
      && typeof (item as { isWeakEvidence?: unknown }).isWeakEvidence === "boolean"
    ))

  if (coverageItems.length === 0) {
    return null
  }

  return {
    highConfidenceChars: coverageItems.reduce((sum, item) => sum + item.highConfidenceChars, 0),
    totalUsefulChars: coverageItems.reduce((sum, item) => sum + item.totalUsefulChars, 0),
    chunkCount: coverageItems.reduce((sum, item) => sum + item.chunkCount, 0),
    isSufficient: coverageItems.every((item) => item.isSufficient),
    isWeakEvidence: coverageItems.some((item) => item.isWeakEvidence),
  }
}

export function readDraftQualitySignalsFromRunSourceSnapshot(value: unknown): Pick<
  DraftQualityGateContext,
  "intakeWarnings" | "evidenceCoverage"
> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      intakeWarnings: [],
      evidenceCoverage: null,
    }
  }

  const snapshots = Array.isArray((value as { sources?: unknown }).sources)
    ? ((value as { sources: unknown[] }).sources
      .filter((item): item is { metadata: Record<string, unknown> } => (
        !!item
        && typeof item === "object"
        && !Array.isArray(item)
        && !!(item as { metadata?: unknown }).metadata
        && typeof (item as { metadata?: unknown }).metadata === "object"
        && !Array.isArray((item as { metadata?: unknown }).metadata)
      )))
    : []

  return {
    intakeWarnings: snapshots.flatMap((snapshot) => readWarningsFromMetadata(snapshot.metadata)),
    evidenceCoverage: aggregateCoverageFromSourceSnapshots(snapshots),
  }
}

export function parsePlannerOutputContent(content: string): PlannerOutput {
  const jsonStr = extractJsonObjectString(content)
  let raw: unknown
  try {
    raw = JSON.parse(jsonStr) as unknown
  } catch {
    throw aiResponseInvalid("模型返回内容不是合法 JSON。")
  }
  const parsed = plannerOutputSchema.safeParse(upgradeLegacyPlannerOutput(raw))
  if (!parsed.success) {
    throw aiResponseInvalid("学习计划生成结果缺少必要字段或结构不完整，请稍后重试。")
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
    return parsePlannerOutputContent(first.content)
  } catch {
    const second = await invokePlannerModel(userContent)
    return parsePlannerOutputContent(second.content)
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
    mastery_points: task.masteryPoints,
    cautions: task.cautions,
    recommended_for_week_1: plan.week1TaskNos.includes(task.taskNo),
    metadata: {
      lessonBrief: task.lessonBrief,
      submissionGuide: task.submissionGuide,
      checkpoints: task.checkpoints,
    },
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
  const { data: draftData, error: draftError } = await runSupabaseQueryWithRetry(
    () =>
      supabase
        .from("learning_plan_drafts")
        .select(
          "id, user_id, intake_id, title, goal, status, revision_no, quality_status, quality_report, alignment_json, week_1_task_ids, updated_at",
        )
        .eq("id", draftId)
        .maybeSingle(),
    {
      context: "failed to load plan draft detail",
    },
  )

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
  const { data: taskRows, error: taskError } = await runSupabaseQueryWithRetry(
    () =>
      supabase
        .from("learning_plan_draft_tasks")
        .select(
          "id, task_no, position, title, objective, practice_steps, acceptance_criteria, estimated_minutes, source_refs, goal_alignment_refs, mastery_points, cautions, recommended_for_week_1, is_user_edited, metadata",
        )
        .eq("draft_id", draftId)
        .order("task_no", { ascending: true }),
    {
      context: "failed to load draft tasks",
    },
  )

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
    mastery_points: unknown
    cautions: unknown
    recommended_for_week_1: boolean
    is_user_edited: boolean
    metadata: unknown
  }>
}

async function loadDraftInputContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  intakeId: string,
): Promise<DraftInputContext> {
  const { data: intakeData, error: intakeError } = await runSupabaseQueryWithRetry(
    () =>
      supabase
        .from("learning_material_intakes")
        .select("input_links, current_constraints, metadata")
        .eq("id", intakeId)
        .maybeSingle(),
    {
      context: "failed to load draft input context",
    },
  )

  assertSupabaseSuccess(intakeError, "failed to load draft input context")

  const intake = intakeData as {
    input_links: unknown
    current_constraints: string | null
    metadata: unknown
  } | null
  const metadata = intake?.metadata && typeof intake.metadata === "object"
    ? intake.metadata as Record<string, unknown>
    : null

  return {
    links: readStringArrayJson(intake?.input_links),
    userGoal: readStringOrNull(metadata?.userGoal),
    weeklyHours: readIntegerOrNull(metadata?.weeklyHours),
    currentConstraints: readStringOrNull(intake?.current_constraints),
  }
}

function toDraftDetailResult(
  draft: Awaited<ReturnType<typeof loadDraftRowForUser>>,
  tasks: Awaited<ReturnType<typeof loadDraftTasks>>,
  inputContext: DraftInputContext,
): PlanDraftDetailResult {
  return {
    draftId: draft.id,
    intakeId: draft.intake_id,
    inputContext,
    title: draft.title,
    goal: draft.goal,
    status: draft.status,
    revisionNo: draft.revision_no,
    qualityStatus: draft.quality_status,
    qualityReport: draft.quality_report,
    alignmentTable: draft.alignment_json,
    week1TaskIds: readStringArrayJson(draft.week_1_task_ids),
    updatedAt: draft.updated_at,
    tasks: tasks.map((task) => {
      const metadata = readJsonRecord(task.metadata)
      return {
        id: task.id,
        taskNo: task.task_no,
        position: task.position,
        title: task.title,
        objective: task.objective,
        lessonBrief: readStringOrNull(metadata.lessonBrief) ?? task.objective,
        practiceSteps: readStringArrayJson(task.practice_steps),
        submissionGuide: readStringOrNull(metadata.submissionGuide) ?? defaultSubmissionGuide(),
        checkpoints: readStringArrayJson(metadata.checkpoints),
        acceptanceCriteria: task.acceptance_criteria,
        estimatedMinutes: task.estimated_minutes,
        sourceRefs: readStringArrayJson(task.source_refs),
        goalAlignmentRefs: readStringArrayJson(task.goal_alignment_refs),
        masteryPoints: readStringArrayJson(task.mastery_points),
        cautions: readCautionItemsJson(task.cautions),
        recommendedForWeek1: task.recommended_for_week_1,
        isUserEdited: task.is_user_edited,
      }
    }),
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
      lessonBrief: task.lessonBrief,
      practiceSteps: task.practiceSteps,
      submissionGuide: task.submissionGuide,
      checkpoints: task.checkpoints,
      acceptanceCriteria: task.acceptanceCriteria,
      estimatedMinutes: task.estimatedMinutes ?? undefined,
      sourceRefs: task.sourceRefs,
      goalAlignmentRefs: task.goalAlignmentRefs,
      masteryPoints: task.masteryPoints,
      cautions: task.cautions,
    })),
  }
}

async function loadDraftQualityGateContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  intakeId: string,
): Promise<DraftQualityGateContext> {
  const { data: intakeData, error: intakeError } = await supabase
    .from("learning_material_intakes")
    .select("latest_run_id")
    .eq("id", intakeId)
    .maybeSingle()

  assertSupabaseSuccess(intakeError, "failed to load draft quality gate intake")

  const intake = intakeData as { latest_run_id: string | null } | null
  let sourceSnapshot: unknown = null

  if (intake?.latest_run_id) {
    const { data: runData, error: runError } = await supabase
      .from("learning_plan_generation_runs")
      .select("source_snapshot")
      .eq("id", intake.latest_run_id)
      .maybeSingle()

    assertSupabaseSuccess(runError, "failed to load latest run source snapshot")
    sourceSnapshot = (runData as { source_snapshot?: unknown } | null)?.source_snapshot ?? null
  }

  if (!sourceSnapshot) {
    const { data: fallbackRunData, error: fallbackRunError } = await supabase
      .from("learning_plan_generation_runs")
      .select("source_snapshot")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    assertSupabaseSuccess(fallbackRunError, "failed to load fallback run source snapshot")
    sourceSnapshot =
      (fallbackRunData as { source_snapshot?: unknown } | null)?.source_snapshot ?? null
  }

  const qualitySignals = readDraftQualitySignalsFromRunSourceSnapshot(sourceSnapshot)
  const qualityRuntime = (await resolveMaterialPipelineModels()).quality

  return {
    ...qualitySignals,
    qualityRuntime,
  }
}

async function syncDraftTasksToPlan(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  draftId: string,
  currentTasks: Awaited<ReturnType<typeof loadDraftTasks>>,
  plan: PlannerOutput,
  now: string,
) {
  const existingTasks = [...currentTasks].sort((a, b) => a.task_no - b.task_no)
  const week1TaskIds: string[] = []

  for (let index = 0; index < plan.tasks.length; index += 1) {
    const plannedTask = plan.tasks[index]!
    const existingTask = existingTasks[index]

    if (existingTask) {
      const { error: updateTaskError } = await supabase
        .from("learning_plan_draft_tasks")
        .update({
          task_no: plannedTask.taskNo,
          position: plannedTask.taskNo,
          title: plannedTask.title.slice(0, 256),
          objective: plannedTask.objective,
          practice_steps: plannedTask.practiceSteps,
          acceptance_criteria: plannedTask.acceptanceCriteria,
          estimated_minutes: plannedTask.estimatedMinutes ?? null,
          source_refs: plannedTask.sourceRefs,
          goal_alignment_refs: plannedTask.goalAlignmentRefs,
          mastery_points: plannedTask.masteryPoints,
          cautions: plannedTask.cautions,
          recommended_for_week_1: plan.week1TaskNos.includes(plannedTask.taskNo),
          metadata: {
            ...readJsonRecord(existingTask.metadata),
            lessonBrief: plannedTask.lessonBrief,
            submissionGuide: plannedTask.submissionGuide,
            checkpoints: plannedTask.checkpoints,
          },
          updated_at: now,
        })
        .eq("id", existingTask.id)
        .eq("draft_id", draftId)

      assertSupabaseSuccess(updateTaskError, "failed to sync draft task to quality-checked plan")

      if (plan.week1TaskNos.includes(plannedTask.taskNo)) {
        week1TaskIds.push(existingTask.id)
      }
      continue
    }

    const { data: insertedTask, error: insertTaskError } = await supabase
      .from("learning_plan_draft_tasks")
      .insert({
        draft_id: draftId,
        task_no: plannedTask.taskNo,
        position: plannedTask.taskNo,
        title: plannedTask.title.slice(0, 256),
        objective: plannedTask.objective,
        practice_steps: plannedTask.practiceSteps,
        acceptance_criteria: plannedTask.acceptanceCriteria,
        estimated_minutes: plannedTask.estimatedMinutes ?? null,
        source_refs: plannedTask.sourceRefs,
        goal_alignment_refs: plannedTask.goalAlignmentRefs,
        mastery_points: plannedTask.masteryPoints,
        cautions: plannedTask.cautions,
        recommended_for_week_1: plan.week1TaskNos.includes(plannedTask.taskNo),
        is_user_edited: false,
        metadata: {
          lessonBrief: plannedTask.lessonBrief,
          submissionGuide: plannedTask.submissionGuide,
          checkpoints: plannedTask.checkpoints,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    assertSupabaseSuccess(insertTaskError, "failed to insert quality-checked draft task")

    if (plan.week1TaskNos.includes(plannedTask.taskNo) && insertedTask?.id) {
      week1TaskIds.push(insertedTask.id as string)
    }
  }

  const extraTaskIds = existingTasks.slice(plan.tasks.length).map((task) => task.id)
  if (extraTaskIds.length > 0) {
    const { error: deleteTaskError } = await supabase
      .from("learning_plan_draft_tasks")
      .delete()
      .eq("draft_id", draftId)
      .in("id", extraTaskIds)

    assertSupabaseSuccess(deleteTaskError, "failed to prune extra draft tasks after quality check")
  }

  return week1TaskIds
}

async function revalidateAndPersistDraftQuality(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    draft: Awaited<ReturnType<typeof loadDraftRowForUser>>
    draftInputContext: DraftInputContext
    tasks: Awaited<ReturnType<typeof loadDraftTasks>>
    title: string
    goal: string | null
    revisionNo: number
    updatedAt: string
  },
) {
  const provisionalDraft = {
    ...input.draft,
    title: input.title,
    goal: input.goal,
    revision_no: input.revisionNo,
    quality_status: "pending",
    quality_report: null,
    week_1_task_ids: input.tasks
      .filter((task) => task.recommended_for_week_1)
      .map((task) => task.id),
    updated_at: input.updatedAt,
  }

  const qualityGateContext = await loadDraftQualityGateContext(supabase, input.draft.intake_id)
  const qualityGateResult = await runPlanQualityGate({
    plan: buildRawPlanFromDraftDetail(
      toDraftDetailResult(provisionalDraft, input.tasks, input.draftInputContext),
    ),
    weeklyHours: input.draftInputContext.weeklyHours,
    intakeWarnings: qualityGateContext.intakeWarnings,
    evidenceCoverage: qualityGateContext.evidenceCoverage,
    qualityRuntime: qualityGateContext.qualityRuntime,
  })

  const week1TaskIds = await syncDraftTasksToPlan(
    supabase,
    input.draft.id,
    input.tasks,
    qualityGateResult.plan,
    input.updatedAt,
  )

  const { error: draftUpdateError } = await supabase
    .from("learning_plan_drafts")
    .update({
      title: qualityGateResult.plan.title,
      goal: qualityGateResult.plan.goal,
      raw_plan_json: qualityGateResult.plan,
      editable_payload: {
        title: qualityGateResult.plan.title,
        goal: qualityGateResult.plan.goal,
        alignmentTable: qualityGateResult.plan.alignmentTable,
        warnings: qualityGateResult.plan.warnings,
        week1TaskNos: qualityGateResult.plan.week1TaskNos,
        tasks: qualityGateResult.plan.tasks,
      },
      week_1_task_ids: week1TaskIds,
      revision_no: input.revisionNo,
      quality_status: qualityGateResult.qualityStatus,
      quality_report: qualityGateResult.qualityReport,
      updated_at: input.updatedAt,
    })
    .eq("id", input.draft.id)

  assertSupabaseSuccess(draftUpdateError, "failed to persist draft quality recheck result")
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
  let userGoal = input.userGoal
  let weeklyHours = input.weeklyHours
  let currentConstraints = input.currentConstraints
  if (
    links.length === 0
    || userGoal === undefined
    || weeklyHours === undefined
    || currentConstraints === undefined
  ) {
    const { data: intakeRow, error: intakeError } = await supabase
      .from("learning_material_intakes")
      .select("input_links, current_constraints, metadata")
      .eq("id", row.intake_id)
      .maybeSingle()

    assertSupabaseSuccess(intakeError, "failed to load intake links")
    const intake = intakeRow as {
      input_links: unknown
      current_constraints: string | null
      metadata: unknown
    } | null
    const metadata = intake?.metadata && typeof intake.metadata === "object"
      ? intake.metadata as Record<string, unknown>
      : null

    if (links.length === 0) {
      links = readStringArrayJson(intake?.input_links)
    }
    if (userGoal === undefined) {
      userGoal = readStringOrNull(metadata?.userGoal)
    }
    if (weeklyHours === undefined) {
      weeklyHours = readIntegerOrNull(metadata?.weeklyHours)
    }
    if (currentConstraints === undefined) {
      currentConstraints = intake?.current_constraints ?? null
    }
  }

  if (userGoal === undefined || weeklyHours === undefined || currentConstraints === undefined) {
    const { data: runRow, error: runError } = await supabase
      .from("learning_plan_generation_runs")
      .select("planner_input")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    assertSupabaseSuccess(runError, "failed to load regenerate planner input")
    const plannerInput = (runRow as { planner_input?: GenerationRunRow["planner_input"] } | null)
      ?.planner_input
    if (userGoal === undefined) {
      userGoal = plannerInput?.userGoal ?? null
    }
    if (weeklyHours === undefined) {
      weeklyHours = plannerInput?.weeklyHours ?? null
    }
    if (currentConstraints === undefined) {
      currentConstraints = plannerInput?.currentConstraints ?? null
    }
  }

  if (links.length === 0) {
    throw aiResponseInvalid("缺少有效教程链接。")
  }

  const now = new Date().toISOString()
  const { data: supersededRows, error: supersedeError } = await supabase
    .from("learning_plan_drafts")
    .update({
      status: "superseded",
      superseded_by_draft_id: null,
      updated_at: now,
    })
    .eq("id", draftId)
    .eq("user_id", userId)
    .eq("status", "draft")
    .select("id")

  assertSupabaseSuccess(supersedeError, "failed to mark old draft as superseded")
  if (!supersededRows?.length) {
    throw planDraftAlreadyConfirmed("仅草稿状态可以重新生成。")
  }

  try {
    const result = await submitMaterialPlanGeneration(supabase, userId, {
      links,
      userGoal,
      weeklyHours,
      currentConstraints,
      sourceDraftId: draftId,
    })

    kickMaterialPlanRun(result.runId)
    return result
  } catch (error) {
    const restoreAt = new Date().toISOString()
    const { error: restoreError } = await supabase
      .from("learning_plan_drafts")
      .update({
        status: "draft",
        superseded_by_draft_id: null,
        updated_at: restoreAt,
      })
      .eq("id", draftId)
      .eq("user_id", userId)
      .eq("status", "superseded")

    assertSupabaseSuccess(restoreError, "failed to restore old draft after regenerate submit failure")
    throw error
  }
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
  const inputContext = await loadDraftInputContext(supabase, draft.intake_id)
  return toDraftDetailResult(draft, tasks, inputContext)
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
  const draftInputContext = await loadDraftInputContext(supabase, draft.intake_id)
  const patchMap = new Map((input.tasks ?? []).map((task) => [task.id, task]))
  const now = new Date().toISOString()
  const nextRevisionNo = draft.revision_no + 1

  assertDraftTasksHaveSupplementalContent(currentTasks.map((task) => {
    const patch = patchMap.get(task.id)
    return {
      taskNo: task.task_no,
      masteryPoints:
        patch?.masteryPoints !== undefined
          ? patch.masteryPoints
          : readStringArrayJson(task.mastery_points),
      cautions:
        patch?.cautions !== undefined
          ? patch.cautions
          : readCautionItemsJson(task.cautions),
    }
  }))

  for (const task of currentTasks) {
    const patch = patchMap.get(task.id)
    if (!patch) {
      continue
    }

    const metadata = readJsonRecord(task.metadata)

    const { error: taskUpdateError } = await supabase
      .from("learning_plan_draft_tasks")
      .update({
        title: patch.title ?? task.title,
        objective: patch.objective ?? task.objective,
        practice_steps: patch.practiceSteps ?? task.practice_steps,
        metadata: {
          ...metadata,
          lessonBrief:
            patch.lessonBrief !== undefined
              ? (patch.lessonBrief ?? task.objective)
              : readStringOrNull(metadata.lessonBrief) ?? task.objective,
          submissionGuide:
            patch.submissionGuide !== undefined
              ? (patch.submissionGuide ?? defaultSubmissionGuide())
              : readStringOrNull(metadata.submissionGuide) ?? defaultSubmissionGuide(),
          checkpoints:
            patch.checkpoints !== undefined
              ? patch.checkpoints
              : readStringArrayJson(metadata.checkpoints),
        },
        acceptance_criteria: patch.acceptanceCriteria ?? task.acceptance_criteria,
        estimated_minutes:
          patch.estimatedMinutes !== undefined ? patch.estimatedMinutes : task.estimated_minutes,
        mastery_points:
          patch.masteryPoints !== undefined ? patch.masteryPoints : task.mastery_points,
        cautions:
          patch.cautions !== undefined ? patch.cautions : task.cautions,
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
  await revalidateAndPersistDraftQuality(supabase, {
    draft,
    draftInputContext,
    tasks: refreshedTasks,
    title: input.title !== undefined ? (input.title ?? draft.title) : draft.title,
    goal: input.goal !== undefined ? input.goal : draft.goal,
    revisionNo: nextRevisionNo,
    updatedAt: now,
  })

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
  parts.push(`当前教案：${targetTask.lessonBrief}`)
  parts.push(`当前操作步骤：${targetTask.practiceSteps.join("；") || "无"}`)
  parts.push(`当前提交说明：${targetTask.submissionGuide}`)
  parts.push(`当前检查点：${targetTask.checkpoints.join("；") || "无"}`)
  parts.push(`当前本关要掌握：${targetTask.masteryPoints.join("；") || "无"}`)
  parts.push(`当前注意事项：${targetTask.cautions.map((item) => item.text).join("；") || "无"}`)
  parts.push("现有任务列表：")
  for (const task of input.draft.tasks) {
    parts.push(`- ${task.taskNo}. ${task.title}｜${task.objective}`)
  }
  parts.push("材料证据分块：")
  for (const chunk of input.chunks) {
    parts.push(`### ${chunk.id}\n${chunk.content}`)
  }
  parts.push("要求：保留相同 taskNo；sourceRefs 只能引用上面的 chunk id；必须输出 lessonBrief、practiceSteps、submissionGuide、checkpoints、masteryPoints 与 cautions；输出更具体、可执行。")
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
  const draftRow = await loadDraftRowForUser(supabase, userId, draftId)
  const draft = await getPlanDraftDetailForUser(userId, draftId)
  if (draftRow.status !== "draft") {
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
      metadata: {
        lessonBrief: regeneratedTask.lessonBrief,
        submissionGuide: regeneratedTask.submissionGuide,
        checkpoints: regeneratedTask.checkpoints,
      },
      estimated_minutes: regeneratedTask.estimatedMinutes ?? null,
      source_refs: regeneratedTask.sourceRefs,
      mastery_points: regeneratedTask.masteryPoints,
      cautions: regeneratedTask.cautions,
      is_user_edited: false,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("draft_id", draftId)

  assertSupabaseSuccess(taskUpdateError, "failed to update regenerated task")

  const refreshedDraft = await getPlanDraftDetailForUser(userId, draftId)
  const refreshedTasks = await loadDraftTasks(supabase, draftId)

  await revalidateAndPersistDraftQuality(supabase, {
    draft: draftRow,
    draftInputContext: draft.inputContext,
    tasks: refreshedTasks,
    title: refreshedDraft.title,
    goal: refreshedDraft.goal,
    revisionNo: nextRevisionNo,
    updatedAt: now,
  })

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
      heartbeat_at: now,
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

export async function finalizeMaterialPlanGenerationFailure(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  run: Pick<GenerationRunRow, "id" | "user_id" | "intake_id" | "draft_id">,
  error: unknown,
  finishedAt = new Date().toISOString(),
) {
  const failure = getFailureInfo(error)

  if (run.draft_id) {
    const { error: restoreDraftError } = await supabase
      .from("learning_plan_drafts")
      .update({
        status: "draft",
        superseded_by_draft_id: null,
        updated_at: finishedAt,
      })
      .eq("id", run.draft_id)
      .eq("user_id", run.user_id)
      .eq("status", "superseded")

    assertSupabaseSuccess(restoreDraftError, "failed to restore superseded draft after regenerate failure")
  }

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

  try {
    const claimed = await claimMaterialPlanRun(supabase, runId)
    if (!claimed) {
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

    const sourceStructure = analyzePlannerSourceStructure(chunks)

    const intakeWarnings = sourceSnapshots.flatMap((snapshot) => readWarningsFromMetadata(snapshot.metadata))
    const evidenceCoverage = aggregateCoverageFromSourceSnapshots(sourceSnapshots)
    const qualityRuntime = (await resolveMaterialPipelineModels()).quality

    let plan: PlannerOutput | null = null
    let qualityGateResult: Awaited<ReturnType<typeof runPlanQualityGate>> | null = null
    let retryFeedback: string | null = null

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const userMessage = buildPlannerUserMessage({
        chunks,
        userGoal: plannerInput?.userGoal ?? null,
        weeklyHours: plannerInput?.weeklyHours ?? null,
        currentConstraints: plannerInput?.currentConstraints ?? null,
        targetToolName,
        learningLevelLabel,
        sourceStructure,
        retryFeedback,
      })

      let planned: PlannerOutput
      try {
        planned = await invokePlannerWithRetry(userMessage)
      } catch (error) {
        if (error instanceof LearningAIProviderError) {
          throw aiProviderFailed(error.message)
        }
        throw error
      }

      plan = {
        ...planned,
        warnings: [...new Set([...(planned.warnings ?? []), ...intakeWarnings])],
      }

      qualityGateResult = await runPlanQualityGate({
        plan,
        weeklyHours: plannerInput?.weeklyHours ?? null,
        intakeWarnings,
        evidenceCoverage,
        qualityRuntime,
        sourceStructure,
        attempt,
        maxAttempts: 2,
      })

      if (qualityGateResult.decision !== "retry") {
        break
      }

      retryFeedback = qualityGateResult.qualityReport.warnings.at(-1) ?? "关卡拆分过粗，请按材料原始节奏重新规划。"
    }

    if (!plan || !qualityGateResult) {
      throw aiResponseInvalid("计划生成流程未返回有效结果。")
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

    if (run.draft_id) {
      const { error: supersedeLinkError } = await supabase
        .from("learning_plan_drafts")
        .update({
          superseded_by_draft_id: draftId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", run.draft_id)
        .eq("user_id", run.user_id)
        .eq("status", "superseded")

      assertSupabaseSuccess(supersedeLinkError, "failed to link superseded draft to regenerated draft")
    }

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
    await finalizeMaterialPlanGenerationFailure(supabase, run, error)
  }
}

registerMaterialPlanRunExecutor(async (runId) => {
  await executeMaterialPlanGenerationRun(runId)
})
