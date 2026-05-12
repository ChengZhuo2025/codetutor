import "server-only"

import { ROUTES } from "@/constants/routes"
import { getLearningLevelLabel } from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

import { aiResponseInvalid, planDraftAlreadyConfirmed, planDraftNotFound } from "./errors.ts"

type DraftRow = {
  id: string
  user_id: string
  intake_id: string
  title: string
  goal: string | null
  status: "draft" | "confirmed" | "rejected" | "superseded"
  revision_no: number
  quality_status: string | null
  confirmed_template_path_id: string | null
  confirmed_user_learning_path_id: string | null
}

type DraftTaskRow = {
  id: string
  task_no: number
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
  metadata: unknown
}

export type ConfirmDraftResult = {
  learningPathId: string
  currentTaskId: string
  redirectTo: string
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

function readStringArrayJsonFromRecord(record: Record<string, unknown>, key: string): string[] {
  return readStringArrayJson(record[key])
}

function readStringFromRecord(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function assertDraftTasksReadyForConfirm(tasks: DraftTaskRow[]) {
  for (const task of tasks) {
    const masteryPoints = readStringArrayJson(task.mastery_points)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    if (masteryPoints.length < 2) {
      throw aiResponseInvalid(`第 ${task.task_no} 关“本关要掌握”至少保留 2 条后才能启用计划。`)
    }

    const cautions = readCautionItemsJson(task.cautions)
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text.length > 0)
    if (cautions.length < 1) {
      throw aiResponseInvalid(`第 ${task.task_no} 关“注意事项”至少保留 1 条后才能启用计划。`)
    }
  }
}

export function assertDraftQualityReadyForConfirm(qualityStatus: string | null | undefined) {
  if (qualityStatus === "passed" || qualityStatus === "pilot_fallback") {
    return
  }

  if (qualityStatus === "pending") {
    throw aiResponseInvalid("草稿刚被编辑或重生成，质量复检尚未完成，请稍后再确认。")
  }

  throw aiResponseInvalid("草稿质量状态异常，请重新生成或稍后重试。")
}

export async function confirmPlanDraft(
  userId: string,
  draftId: string,
): Promise<ConfirmDraftResult> {
  const supabase = createSupabaseAdminClient()

  const { data: draftData, error: draftError } = await supabase
    .from("learning_plan_drafts")
    .select(
      "id, user_id, intake_id, title, goal, status, revision_no, quality_status, confirmed_template_path_id, confirmed_user_learning_path_id",
    )
    .eq("id", draftId)
    .maybeSingle()

  assertSupabaseSuccess(draftError, "failed to load plan draft")
  const draft = draftData as DraftRow | null
  if (!draft || draft.user_id !== userId) {
    throw planDraftNotFound()
  }

  if (draft.status === "confirmed" && draft.confirmed_user_learning_path_id) {
    const { data: ulp, error: ulpError } = await supabase
      .from("user_learning_paths")
      .select("current_task_id, template_path_id")
      .eq("id", draft.confirmed_user_learning_path_id)
      .eq("user_id", userId)
      .maybeSingle()

    assertSupabaseSuccess(ulpError, "failed to load confirmed path")
    const row = ulp as {
      current_task_id: string | null
      template_path_id: string | null
    } | null

    if (row) {
      let taskId = row.current_task_id
      if (!taskId && row.template_path_id) {
        const { data: firstStep, error: stepError } = await supabase
          .from("path_steps")
          .select("id")
          .eq("path_id", row.template_path_id)
          .order("step_no", { ascending: true })
          .limit(1)
          .maybeSingle()

        assertSupabaseSuccess(stepError, "failed to load first path step")
        const stepId = (firstStep as { id: string } | null)?.id
        if (stepId) {
          const { data: ut, error: utError } = await supabase
            .from("user_tasks")
            .select("id")
            .eq("user_learning_path_id", draft.confirmed_user_learning_path_id)
            .eq("path_step_id", stepId)
            .maybeSingle()

          assertSupabaseSuccess(utError, "failed to load first user task")
          taskId = (ut as { id: string } | null)?.id ?? null
        }
      }

      if (taskId) {
        return {
          learningPathId: draft.confirmed_user_learning_path_id,
          currentTaskId: taskId,
          redirectTo: ROUTES.learn,
        }
      }
    }
  }

  if (draft.status !== "draft") {
    throw planDraftAlreadyConfirmed()
  }

  assertDraftQualityReadyForConfirm(draft.quality_status)

  const { data: taskRows, error: tasksError } = await supabase
    .from("learning_plan_draft_tasks")
    .select("id, task_no, title, objective, practice_steps, acceptance_criteria, estimated_minutes, source_refs, goal_alignment_refs, mastery_points, cautions, recommended_for_week_1, metadata")
    .eq("draft_id", draftId)
    .order("task_no", { ascending: true })

  assertSupabaseSuccess(tasksError, "failed to load draft tasks")
  const tasks = (taskRows ?? []) as DraftTaskRow[]
  if (tasks.length === 0) {
    throw aiResponseInvalid("草稿没有任务明细。")
  }
  assertDraftTasksReadyForConfirm(tasks)

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .select("primary_tool_id, learning_level")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load profile for confirm")
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

  assertSupabaseSuccess(toolError, "failed to load tool for confirm")
  const tool = toolData as { id: string; code: string; name: string } | null
  if (!tool) {
    throw aiResponseInvalid("主工具不存在。")
  }

  const now = new Date().toISOString()
  const pathCode = `mp-${draftId}`
  const pathName = draft.title.slice(0, 128)
  const pathDescription = draft.goal?.slice(0, 2000) ?? pathName

  const { data: insertedPath, error: pathInsertError } = await supabase
    .from("learning_paths")
    .insert({
      tool_id: tool.id,
      code: pathCode,
      name: pathName,
      target_level: profile.learning_level,
      source_type: "self_directed",
      version: 1,
      is_default: false,
      is_active: true,
      stage_count: tasks.length,
      description: pathDescription,
      metadata: {
        seed_source: "plan_draft_confirmed",
        draft_id: draftId,
        intake_id: draft.intake_id,
        learning_level_label: getLearningLevelLabel(profile.learning_level),
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(pathInsertError, "failed to insert material learning path template")
  const templatePathId = insertedPath?.id as string

  const stepInserts = tasks.map((t) => {
    const metadata = readJsonRecord(t.metadata)
    const practiceSteps = readStringArrayJson(t.practice_steps)
    return {
      path_id: templatePathId,
      step_no: t.task_no,
      title: t.title.slice(0, 128),
      summary:
        practiceSteps.length > 0
          ? practiceSteps.join("；").slice(0, 4000)
          : String(t.practice_steps).slice(0, 4000),
      focus: readStringFromRecord(metadata, "lessonBrief")?.slice(0, 4000) ?? null,
      goal: t.objective.slice(0, 4000),
      completion_criteria: t.acceptance_criteria.slice(0, 4000),
      review_summary: null,
      estimated_minutes: t.estimated_minutes ?? 45,
      reward_score: 10,
      knowledge_points: readStringArrayJson(t.mastery_points).slice(0, 4),
      key_points: readStringArrayJson(t.mastery_points),
      pitfalls: readCautionItemsJson(t.cautions),
      difficulty_weight: 1,
      is_required: true,
      metadata: {
        source_refs: t.source_refs,
        goal_alignment_refs: t.goal_alignment_refs,
        recommended_for_week_1: t.recommended_for_week_1,
        draft_revision_no: draft.revision_no,
        lessonBrief: readStringFromRecord(metadata, "lessonBrief") ?? t.objective,
        practiceSteps,
        submissionGuide:
          readStringFromRecord(metadata, "submissionGuide")
          ?? "完成后把你的产出、截图、代码、终端输出或报错信息发给 AI 教练。",
        checkpoints: readStringArrayJsonFromRecord(metadata, "checkpoints"),
      },
      created_at: now,
      updated_at: now,
    }
  })

  const { data: insertedSteps, error: stepsError } = await supabase
    .from("path_steps")
    .insert(stepInserts)
    .select("id, step_no")
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepsError, "failed to insert path steps")
  const orderedSteps = (insertedSteps ?? []) as Array<{ id: string; step_no: number }>
  if (orderedSteps.length !== tasks.length) {
    throw new Error("path_steps insert count mismatch")
  }

  const { error: archiveError } = await supabase
    .from("user_learning_paths")
    .update({
      status: "archived",
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(archiveError, "failed to archive active learning paths")

  const { data: createdUlp, error: ulpInsertError } = await supabase
    .from("user_learning_paths")
    .insert({
      user_id: userId,
      template_path_id: templatePathId,
      tool_id: tool.id,
      path_code_snapshot: pathCode,
      path_name_snapshot: pathName,
      path_summary_snapshot: pathDescription,
      learning_level: profile.learning_level,
      selection_mode: "self_directed",
      status: "active",
      total_steps: orderedSteps.length,
      completed_steps: 0,
      started_at: now,
      last_activity_at: now,
      metadata: {
        seedSource: "plan_draft_confirmed",
        draftId,
        intakeId: draft.intake_id,
        draftRevisionNo: draft.revision_no,
        sourceRefs: tasks.map((task) => ({
          taskId: task.id,
          taskNo: task.task_no,
          sourceRefs: task.source_refs,
          goalAlignmentRefs: task.goal_alignment_refs,
          masteryPoints: task.mastery_points,
          cautions: task.cautions,
          recommendedForWeek1: task.recommended_for_week_1,
        })),
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(ulpInsertError, "failed to create user learning path")
  const userLearningPathId = createdUlp?.id as string

  const taskRowsForUser = orderedSteps.map((step, index) => ({
    user_id: userId,
    user_learning_path_id: userLearningPathId,
    path_step_id: step.id,
    status: index === 0 ? "in_progress" : "not_started",
    started_at: index === 0 ? now : null,
    attempt_count: 0,
    score_awarded: 0,
    metadata: {},
    created_at: now,
    updated_at: now,
  }))

  const { data: createdTasks, error: utError } = await supabase
    .from("user_tasks")
    .insert(taskRowsForUser)
    .select("id, path_step_id")

  assertSupabaseSuccess(utError, "failed to create user tasks")

  const firstTaskId =
    orderedSteps
      .map((step) => createdTasks?.find((task) => task.path_step_id === step.id)?.id)
      .find((id): id is string => Boolean(id)) ?? null

  if (!firstTaskId) {
    throw new Error("failed to resolve first task after confirm")
  }

  const { error: patchUlpError } = await supabase
    .from("user_learning_paths")
    .update({
      current_task_id: firstTaskId,
      updated_at: now,
    })
    .eq("id", userLearningPathId)

  assertSupabaseSuccess(patchUlpError, "failed to set current_task_id")

  const { error: profilePatchError } = await supabase
    .from("user_profiles")
    .update({
      last_active_task_id: firstTaskId,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(profilePatchError, "failed to update profile last_active_task_id")

  const { data: updatedDrafts, error: draftUpdateError } = await supabase
    .from("learning_plan_drafts")
    .update({
      status: "confirmed",
      confirmed_template_path_id: templatePathId,
      confirmed_user_learning_path_id: userLearningPathId,
      updated_at: now,
    })
    .eq("id", draftId)
    .eq("user_id", userId)
    .eq("status", "draft")
    .select("id")

  assertSupabaseSuccess(draftUpdateError, "failed to mark draft confirmed")
  if (!updatedDrafts?.length) {
    throw planDraftAlreadyConfirmed()
  }

  return {
    learningPathId: userLearningPathId,
    currentTaskId: firstTaskId,
    redirectTo: ROUTES.learn,
  }
}
