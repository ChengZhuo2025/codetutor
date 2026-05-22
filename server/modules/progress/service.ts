import type {
  ProgressCurrentResponseData,
  ProgressMapResponseData,
} from "@/lib/api/contracts/progress"
import {
  getNextRankDefinition,
  getRankName,
  getRemainingXpToNextRank,
} from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCheckinDateKey } from "@/server/modules/checkins/logic"
import { reconcileInterruptedLearningPaths } from "@/server/modules/learning-paths/service"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type { Stage } from "@/features/progress/types"
import { resolveStageReviewSummary } from "@/features/progress/lib/review-navigation"

type JsonRecord = Record<string, unknown>

type ProfileRow = {
  user_id: string
  current_score: number
  current_rank_code: string
  streak_days: number
}

type ActivePathRow = {
  id: string
  tool_id: string
  path_name_snapshot: string
  path_summary_snapshot: string | null
  total_steps: number
  completed_steps: number
  current_task_id: string | null
  template_path_id: string | null
}

type ToolRow = {
  id: string
  code: string
  name: string
}

type TaskRow = {
  id: string
  path_step_id: string
  status: string
  last_conversation_id: string | null
}

type DailyCheckinRow = {
  checkin_date: string
}

type StepRow = {
  id: string
  step_no: number
  title: string
  summary: string
  focus: string | null
  goal: string
  completion_criteria: string | null
  review_summary: string | null
  estimated_minutes: number | null
  reward_score: number
  knowledge_points: unknown
  key_points: unknown
  pitfalls: unknown
}

function toStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[]
  }

  return input.filter((item): item is string => typeof item === "string")
}

function toPitfalls(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as Stage["pitfalls"]
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const record = item as JsonRecord
      const text = record.text

      if (typeof text !== "string") {
        return null
      }

      const pitfall = { text } as Stage["pitfalls"][number]

      if (typeof record.isTrap === "boolean") {
        pitfall.isTrap = record.isTrap
      }

      return pitfall
    })
    .filter((item): item is Stage["pitfalls"][number] => Boolean(item))
}

function getRankSummary(currentRankCode: string, currentScore: number) {
  const nextRank = getNextRankDefinition(currentRankCode)

  return {
    currentRank: getRankName(currentRankCode),
    nextRank: nextRank.name,
    remainingXPToNextRank: getRemainingXpToNextRank(currentRankCode, currentScore),
  }
}

async function loadActivePath(userId: string) {
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, current_score, current_rank_code, streak_days")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load user profile")

  const { data: activePath, error: activePathError } = await supabase
    .from("user_learning_paths")
    .select("id, tool_id, path_name_snapshot, path_summary_snapshot, total_steps, completed_steps, current_task_id, template_path_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(activePathError, "failed to load active learning path")

  if (!profile || !activePath) {
    return null
  }

  const { data: tool, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("id", activePath.tool_id)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load current tool")

  if (!tool) {
    return null
  }

  const { data: tasks, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, path_step_id, status, last_conversation_id")
    .eq("user_learning_path_id", activePath.id)

  assertSupabaseSuccess(taskError, "failed to load active path tasks")

  const taskRows = (tasks ?? []) as TaskRow[]
  const taskStepIds = Array.from(new Set(taskRows.map((task) => task.path_step_id)))
  const todayDate = getCheckinDateKey()
  const { data: todayCheckin, error: todayCheckinError } = await supabase
    .from("daily_checkins")
    .select("checkin_date")
    .eq("user_id", userId)
    .eq("checkin_date", todayDate)
    .limit(1)

  assertSupabaseSuccess(todayCheckinError, "failed to load today checkin")

  const { data: steps, error: stepError } = await supabase
    .from("path_steps")
    .select("id, step_no, title, summary, focus, goal, completion_criteria, review_summary, estimated_minutes, reward_score, knowledge_points, key_points, pitfalls")
    .in("id", taskStepIds.length > 0 ? taskStepIds : ["00000000-0000-0000-0000-000000000000"])
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to load active path steps")

  return {
    profile: profile as ProfileRow,
    activePath: activePath as ActivePathRow,
    tool: tool as ToolRow,
    tasks: taskRows,
    checkedInToday: ((todayCheckin ?? []) as DailyCheckinRow[]).length > 0,
    steps: (steps ?? []) as StepRow[],
  }
}

export async function getProgressCurrentData(
  userId: string,
): Promise<ProgressCurrentResponseData | null> {
  const state = await loadActivePath(userId)

  if (!state) {
    return null
  }

  const currentTask =
    state.tasks.find((task) => task.id === state.activePath.current_task_id) ??
    state.tasks.find((task) => task.status === "in_progress") ??
    null
  const currentStep =
    state.steps.find((step) => step.id === currentTask?.path_step_id) ??
    state.steps[0] ??
    null

  if (!currentStep) {
    return null
  }

  const rankSummary = getRankSummary(
    state.profile.current_rank_code,
    state.profile.current_score,
  )

  return {
    currentTool: {
      id: state.tool.code,
      label: state.tool.name,
    },
    currentPathName: state.activePath.path_name_snapshot,
    currentTaskTitle: currentStep.title,
    currentScore: state.profile.current_score,
    currentRank: rankSummary.currentRank,
    streakDays: state.profile.streak_days,
    checkedInToday: state.checkedInToday,
    summary: {
      totalXP: state.profile.current_score,
      currentRank: rankSummary.currentRank,
      nextRank: rankSummary.nextRank,
      remainingXPToNextRank: rankSummary.remainingXPToNextRank,
      streakDays: state.profile.streak_days,
    },
  }
}

export async function getProgressMapData(
  userId: string,
): Promise<ProgressMapResponseData | null> {
  const state = await loadActivePath(userId)

  if (!state) {
    return null
  }

  const taskByStepId = new Map(state.tasks.map((task) => [task.path_step_id, task]))
  const currentTask =
    state.tasks.find((task) => task.id === state.activePath.current_task_id) ??
    state.tasks.find((task) => task.status === "in_progress") ??
    null
  const currentStepNo =
    state.steps.find((step) => step.id === currentTask?.path_step_id)?.step_no ??
    state.steps.find((step) => {
      const task = taskByStepId.get(step.id)
      return task?.status !== "completed"
    })?.step_no ??
    state.steps[0]?.step_no ??
    1

  const stages: Stage[] = state.steps.map((step) => {
    const task = taskByStepId.get(step.id)
    let status: Stage["status"] = "locked"

    if (task?.status === "completed") {
      status = "done"
    } else if (step.step_no === currentStepNo) {
      status = "current"
    }

    return {
      id: step.step_no,
      taskId: task?.id ?? `task-${step.step_no}`,
      reviewSessionId: task?.last_conversation_id ?? null,
      title: step.title,
      summary: step.summary,
      goal: step.goal,
      completionCriteria: step.completion_criteria ?? "",
      reviewSummary: resolveStageReviewSummary({
        title: step.title,
        reviewSummary: step.review_summary,
        keyPoints: toStringArray(step.key_points),
        summary: step.summary,
        goal: step.goal,
      }),
      xp: step.reward_score,
      status,
      tags: toStringArray(step.knowledge_points),
      keyPoints: toStringArray(step.key_points),
      pitfalls: toPitfalls(step.pitfalls),
      estimatedTime: step.estimated_minutes ? `${step.estimated_minutes} 分钟` : "待定",
      focus: step.focus ?? "",
      unlockHint:
        status === "locked"
          ? `完成第 ${currentStepNo} 关后解锁`
          : undefined,
    }
  })

  return {
    pathName: state.activePath.path_name_snapshot,
    pathSummary: state.activePath.path_summary_snapshot ?? "",
    totalSteps: state.activePath.total_steps,
    completedSteps: state.activePath.completed_steps,
    currentStageId: currentStepNo,
    stages,
  }
}
