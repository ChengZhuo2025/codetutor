import { ROUTES } from "@/constants/routes"
import { getRankName } from "@/constants/ranks"
import type {
  CompleteTaskRequest,
  CompleteTaskResponseData,
  UpdateTaskStatusRequest,
  UpdateTaskStatusResponseData,
} from "@/lib/api/contracts/task"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { normalizeUuid } from "@/server/lib/identifiers"
import {
  awardTaskCompletionScore,
  ensureUserRankSnapshot,
} from "@/server/modules/gamification/service"
import { reconcileInterruptedLearningPaths } from "@/server/modules/learning-paths/service"
import { createProgressMilestoneNotification } from "@/server/modules/notifications/service"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  resolveTaskProgression,
  type TaskPersistentStatus,
} from "./logic"

type TaskRow = {
  id: string
  user_id: string
  user_learning_path_id: string
  path_step_id: string
  status: TaskPersistentStatus
  started_at: string | null
  completed_at: string | null
  blocked_at: string | null
  block_reason: string | null
  attempt_count: number
  last_conversation_id: string | null
  score_awarded: number
}

type PathRow = {
  id: string
  user_id: string
  template_path_id: string | null
  status: "active" | "interrupted" | "completed" | "abandoned" | "archived"
  total_steps: number
  completed_steps: number
  current_task_id: string | null
}

type PathTaskStepRow = {
  id: string
  step_no: number
  title: string
  reward_score: number
}

type ProfileRow = {
  user_id: string
  current_score: number
  current_rank_code: string
}

async function loadTask(taskId: string, userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_tasks")
    .select(
      "id, user_id, user_learning_path_id, path_step_id, status, started_at, completed_at, blocked_at, block_reason, attempt_count, last_conversation_id, score_awarded",
    )
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load task")

  return (data as TaskRow | null) ?? null
}

async function loadPath(pathId: string, userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, user_id, template_path_id, status, total_steps, completed_steps, current_task_id")
    .eq("id", pathId)
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load learning path")

  return (data as PathRow | null) ?? null
}

async function loadProfile(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, current_score, current_rank_code")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load user profile")

  return (data as ProfileRow | null) ?? null
}

async function loadPathTasks(pathId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_tasks")
    .select("id, user_id, user_learning_path_id, path_step_id, status, started_at, completed_at, blocked_at, block_reason, attempt_count, last_conversation_id, score_awarded")
    .eq("user_learning_path_id", pathId)

  assertSupabaseSuccess(error, "failed to load path tasks")

  return (data ?? []) as TaskRow[]
}

async function loadTaskSteps(path: PathRow, pathTasks: TaskRow[]) {
  const supabase = createSupabaseAdminClient()

  if (path.template_path_id) {
    const { data, error } = await supabase
      .from("path_steps")
      .select("id, step_no, title, reward_score")
      .eq("path_id", path.template_path_id)
      .order("step_no", { ascending: true })

    assertSupabaseSuccess(error, "failed to load path steps")

    return (data ?? []) as PathTaskStepRow[]
  }

  const pathStepIds = Array.from(new Set(pathTasks.map((task) => task.path_step_id)))
  if (pathStepIds.length === 0) {
    return [] as PathTaskStepRow[]
  }

  const { data, error } = await supabase
    .from("path_steps")
    .select("id, step_no, title, reward_score")
    .in("id", pathStepIds)
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(error, "failed to load standalone path steps")

  return (data ?? []) as PathTaskStepRow[]
}

function normalizeReason(reason: string | null | undefined) {
  if (typeof reason !== "string") {
    return null
  }

  const normalized = reason.trim()
  return normalized.length > 0 ? normalized : null
}

function buildCompletionSummary(completedTitle: string, nextTaskTitle: string | null) {
  if (nextTaskTitle) {
    return `已完成「${completedTitle}」，下一步进入「${nextTaskTitle}」。`
  }

  return `已完成「${completedTitle}」，当前学习计划也全部完成了。`
}

function assertActivePath(path: PathRow) {
  if (path.status !== "active") {
    throw new Error("当前学习计划不是进行中状态，无法更新关卡。")
  }
}

export async function completeTask(
  userId: string,
  input: CompleteTaskRequest,
): Promise<CompleteTaskResponseData | null> {
  await reconcileInterruptedLearningPaths(userId)

  const task = await loadTask(input.taskId, userId)
  if (!task) {
    return null
  }

  const path = await loadPath(task.user_learning_path_id, userId)
  if (!path) {
    return null
  }

  const profile = await loadProfile(userId)
  if (!profile) {
    throw new Error("当前用户档案不存在，无法完成关卡。")
  }

  const pathTasks = await loadPathTasks(path.id)
  const steps = await loadTaskSteps(path, pathTasks)
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const currentStep = stepById.get(task.path_step_id)

  if (!currentStep) {
    throw new Error("当前任务步骤不存在，无法完成关卡。")
  }

  if (task.status === "completed") {
    const nextTask =
      path.current_task_id === null
        ? null
        : pathTasks.find((item) => item.id === path.current_task_id) ?? null
    const nextTaskTitle = nextTask ? stepById.get(nextTask.path_step_id)?.title ?? "下一关" : null

    return {
      taskId: task.id,
      taskStatus: "completed",
      scoreDelta: 0,
      currentScore: profile.current_score,
      currentRank: getRankName(profile.current_rank_code),
      rankChanged: false,
      completionSummary: buildCompletionSummary(currentStep.title, nextTaskTitle),
      nextTask:
        nextTask && nextTaskTitle
          ? {
              taskId: nextTask.id,
              title: nextTaskTitle,
            }
          : null,
    }
  }

  assertActivePath(path)

  if (path.current_task_id !== task.id) {
    throw new Error("只能完成当前正在进行的关卡。")
  }

  const progression = resolveTaskProgression({
    currentTaskId: task.id,
    totalSteps: path.total_steps,
    tasks: pathTasks.map((item) => ({
      id: item.id,
      stepNo: stepById.get(item.path_step_id)?.step_no ?? Number.MAX_SAFE_INTEGER,
      status: item.status,
    })),
  })

  const now = new Date().toISOString()
  const scoreDelta = task.score_awarded > 0 ? 0 : currentStep.reward_score
  const conversationId = normalizeUuid(input.conversationId)
  const nextTask =
    progression.nextTaskId === null
      ? null
      : pathTasks.find((item) => item.id === progression.nextTaskId) ?? null
  const nextTaskTitle = nextTask ? stepById.get(nextTask.path_step_id)?.title ?? "下一关" : null
  const nextScore = profile.current_score + scoreDelta
  const supabase = createSupabaseAdminClient()

  const { error: completeTaskError } = await supabase
    .from("user_tasks")
    .update({
      status: "completed",
      started_at: task.started_at ?? now,
      completed_at: task.completed_at ?? now,
      blocked_at: null,
      block_reason: null,
      attempt_count: Math.max(1, task.attempt_count),
      last_conversation_id: conversationId ?? task.last_conversation_id,
      score_awarded: scoreDelta > 0 ? currentStep.reward_score : task.score_awarded,
      updated_at: now,
    })
    .eq("id", task.id)
    .eq("user_id", userId)

  assertSupabaseSuccess(completeTaskError, "failed to complete task")

  if (nextTask) {
    const { error: nextTaskError } = await supabase
      .from("user_tasks")
      .update({
        status: "in_progress",
        started_at: nextTask.started_at ?? now,
        blocked_at: null,
        block_reason: null,
        updated_at: now,
      })
      .eq("id", nextTask.id)
      .eq("user_id", userId)

    assertSupabaseSuccess(nextTaskError, "failed to activate next task")
  }

  const nextPathStatus = progression.pathCompleted ? "completed" : "active"
  const { error: pathError } = await supabase
    .from("user_learning_paths")
    .update({
      status: nextPathStatus,
      completed_steps: progression.completedSteps,
      current_task_id: progression.pathCompleted ? null : progression.nextTaskId,
      last_activity_at: now,
      completed_at: progression.pathCompleted ? now : null,
      updated_at: now,
    })
    .eq("id", path.id)
    .eq("user_id", userId)

  assertSupabaseSuccess(pathError, "failed to advance learning path")

  if (conversationId) {
    const { error: sessionError } = await supabase
      .from("conversation_sessions")
      .update({
        status: "completed",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("status", "active")

    assertSupabaseSuccess(sessionError, "failed to close conversation session on task completion")
  }

  await awardTaskCompletionScore(supabase, {
    userId,
    taskId: task.id,
    scoreDelta,
    sourceRef: path.id,
    remark: `Completed task: ${currentStep.title}`,
    createdAt: now,
  })

  const rankSnapshot = await ensureUserRankSnapshot(supabase, {
    userId,
    currentScore: nextScore,
    updatedAt: now,
  })

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      current_score: nextScore,
      current_rank_code: rankSnapshot.rankCode,
      last_learning_at: now,
      last_active_task_id: progression.pathCompleted ? null : progression.nextTaskId,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(profileError, "failed to update user profile score")

  await createProgressMilestoneNotification(userId, {
    title: "任务已完成",
    content: buildCompletionSummary(currentStep.title, nextTaskTitle),
    actionHref: progression.pathCompleted ? ROUTES.history : ROUTES.learn,
    actionLabel: progression.pathCompleted ? "查看历史" : "继续学习",
    payload: {
      taskId: task.id,
      pathId: path.id,
      nextTaskId: progression.nextTaskId,
      pathCompleted: progression.pathCompleted,
    },
  })

  return {
    taskId: task.id,
    taskStatus: "completed",
    scoreDelta,
    currentScore: nextScore,
    currentRank: getRankName(rankSnapshot.rankCode),
    rankChanged: rankSnapshot.rankCode !== profile.current_rank_code,
    completionSummary: buildCompletionSummary(currentStep.title, nextTaskTitle),
    nextTask:
      nextTask && nextTaskTitle
        ? {
            taskId: nextTask.id,
            title: nextTaskTitle,
          }
        : null,
  }
}

export async function updateTaskStatus(
  userId: string,
  input: UpdateTaskStatusRequest,
): Promise<UpdateTaskStatusResponseData | null> {
  await reconcileInterruptedLearningPaths(userId)

  const task = await loadTask(input.taskId, userId)
  if (!task) {
    return null
  }

  const path = await loadPath(task.user_learning_path_id, userId)
  if (!path) {
    return null
  }

  assertActivePath(path)

  if (path.current_task_id !== task.id) {
    throw new Error("只能更新当前正在进行的关卡状态。")
  }

  const nextStatus = input.status
  const nextReason = nextStatus === "blocked" ? normalizeReason(input.reason) : null
  const now = new Date().toISOString()
  const supabase = createSupabaseAdminClient()

  const { error: taskError } = await supabase
    .from("user_tasks")
    .update({
      status: nextStatus,
      started_at: task.started_at ?? now,
      blocked_at: nextStatus === "blocked" ? now : null,
      block_reason: nextReason,
      updated_at: now,
    })
    .eq("id", task.id)
    .eq("user_id", userId)

  assertSupabaseSuccess(taskError, "failed to update task status")

  const { error: pathError } = await supabase
    .from("user_learning_paths")
    .update({
      current_task_id: task.id,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", path.id)
    .eq("user_id", userId)

  assertSupabaseSuccess(pathError, "failed to touch learning path after task status update")

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      last_learning_at: now,
      last_active_task_id: task.id,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(profileError, "failed to touch profile after task status update")

  return {
    taskId: task.id,
    taskStatus: nextStatus,
    reason: nextReason,
  }
}
