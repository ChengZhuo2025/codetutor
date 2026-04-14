import type {
  LearningHistoryDetailResponseData,
  LearningHistoryResponseData,
} from "@/lib/api/contracts/history"
import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type {
  HistoryFilter,
  HistoryPlanAction,
  LearningHistory,
  LearningHistoryDetailStep,
  LearningHistorySummary,
} from "@/features/history/types"
import {
  getLearningPathStatusSummary,
  reconcileInterruptedLearningPaths,
} from "@/server/modules/learning-paths/service"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"

type HistoryPathRow = {
  id: string
  template_path_id: string | null
  tool_id: string
  path_code_snapshot: string
  path_name_snapshot: string
  path_summary_snapshot: string | null
  learning_level: "beginner" | "intermediate" | "advanced"
  selection_mode: "self_directed" | "preset_training"
  status: "active" | "interrupted" | "completed" | "abandoned" | "archived"
  total_steps: number
  completed_steps: number
  started_at: string
  last_activity_at: string | null
  completed_at: string | null
  interrupted_at: string | null
  abandoned_at: string | null
  created_at: string
  updated_at: string
}

type HistoryTaskRow = {
  id: string
  user_learning_path_id: string
  path_step_id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
  score_awarded: number
  completed_at: string | null
}

type ToolRow = {
  id: string
  name: string
}

type StepRow = {
  id: string
  step_no: number
  title: string
  reward_score: number
}

const HISTORY_STATUS_MAP: Record<
  HistoryPathRow["status"],
  LearningHistory["status"]
> = {
  active: "in_progress",
  interrupted: "interrupted",
  completed: "completed",
  abandoned: "abandoned",
  archived: "completed",
}

const FILTER_STATUS_MAP: Record<Exclude<HistoryFilter, "all">, HistoryPathRow["status"]> = {
  in_progress: "active",
  interrupted: "interrupted",
  completed: "completed",
  abandoned: "abandoned",
}

function mapPathToHistoryItem(
  item: HistoryPathRow,
  toolNameById: Map<string, string>,
  xpByPathId: Map<string, number>,
): LearningHistory {
  return {
    id: item.id,
    planId: item.path_code_snapshot,
    title: item.path_name_snapshot,
    summary: item.path_summary_snapshot ?? "",
    tool: toolNameById.get(item.tool_id) ?? "未知工具",
    level: getLearningLevelLabel(item.learning_level, "short"),
    mode: getSelectionModeLabel(item.selection_mode, "short"),
    progress: {
      completed: item.completed_steps,
      total: item.total_steps,
      percent:
        item.total_steps > 0
          ? Math.round((item.completed_steps / item.total_steps) * 100)
          : 0,
    },
    xpEarned: xpByPathId.get(item.id) ?? 0,
    createdAt: toIsoDate(item.created_at),
    updatedAt: toIsoDate(item.updated_at),
    status: HISTORY_STATUS_MAP[item.status] ?? "in_progress",
  }
}

async function loadPathById(userId: string, pathId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select(
      "id, template_path_id, tool_id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, started_at, last_activity_at, completed_at, interrupted_at, abandoned_at, created_at, updated_at",
    )
    .eq("id", pathId)
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load history path")
  return (data as HistoryPathRow | null) ?? null
}

async function buildHistorySummary(userId: string) {
  const summary = await getLearningPathStatusSummary(userId)
  return {
    activeCount: summary.activeCount,
    interruptedCount: summary.interruptedCount,
    completedCount: summary.completedCount,
    abandonedCount: summary.abandonedCount,
    totalCount: summary.totalCount,
    activePlanId: summary.activePathId,
    canCreateNewPlan: summary.canCreateNewPlan,
  } satisfies LearningHistorySummary
}

export async function getRecentHistoryData(
  userId: string,
  page = 1,
  pageSize = 20,
  filter: HistoryFilter = "all",
): Promise<LearningHistoryResponseData> {
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(50, Math.max(1, pageSize))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1
  const statusFilter = filter === "all" ? null : FILTER_STATUS_MAP[filter]
  let pathQuery = supabase
    .from("user_learning_paths")
    .select(
      "id, template_path_id, tool_id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, started_at, last_activity_at, completed_at, interrupted_at, abandoned_at, created_at, updated_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .in("status", ["active", "interrupted", "completed", "abandoned"])
    .order("updated_at", { ascending: false })
    .range(from, to)

  if (statusFilter) {
    pathQuery = pathQuery.eq("status", statusFilter)
  }

  const { data: paths, error: pathError, count } = await pathQuery

  assertSupabaseSuccess(pathError, "failed to load history list")

  const historyPaths = (paths ?? []) as HistoryPathRow[]
  const pathIds = historyPaths.map((item) => item.id)
  const toolIds = Array.from(new Set(historyPaths.map((item) => item.tool_id)))
  const { data: tasks, error: taskError } =
    pathIds.length === 0
      ? { data: [] as HistoryTaskRow[], error: null }
      : await supabase
          .from("user_tasks")
          .select("id, user_learning_path_id, path_step_id, status, score_awarded, completed_at")
          .in("user_learning_path_id", pathIds)

  assertSupabaseSuccess(taskError, "failed to load history task summaries")

  const { data: tools, error: toolError } =
    toolIds.length === 0
      ? { data: [] as ToolRow[], error: null }
      : await supabase
          .from("learning_tools")
          .select("id, name")
          .in("id", toolIds)

  assertSupabaseSuccess(toolError, "failed to load history tool names")

  const xpByPathId = new Map<string, number>()
  const toolNameById = new Map(((tools ?? []) as ToolRow[]).map((tool) => [tool.id, tool.name]))

  for (const task of (tasks ?? []) as HistoryTaskRow[]) {
    xpByPathId.set(
      task.user_learning_path_id,
      (xpByPathId.get(task.user_learning_path_id) ?? 0) + task.score_awarded,
    )
  }

  return {
    items: historyPaths.map((item) => mapPathToHistoryItem(item, toolNameById, xpByPathId)),
    total: count ?? historyPaths.length,
    page: safePage,
    hasMore: from + historyPaths.length < (count ?? historyPaths.length),
    filter,
    summary: await buildHistorySummary(userId),
  }
}

export async function getHistoryDetail(
  userId: string,
  pathId: string,
): Promise<LearningHistoryDetailResponseData | null> {
  await reconcileInterruptedLearningPaths(userId)

  const path = await loadPathById(userId, pathId)

  if (!path || path.status === "archived") {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data: tool, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, name")
    .eq("id", path.tool_id)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load history detail tool")

  const { data: tasks, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, user_learning_path_id, path_step_id, status, score_awarded, completed_at")
    .eq("user_learning_path_id", path.id)

  assertSupabaseSuccess(taskError, "failed to load history detail tasks")

  const { data: steps, error: stepError } =
    path.template_path_id === null
      ? { data: [] as StepRow[], error: null }
      : await supabase
          .from("path_steps")
          .select("id, step_no, title, reward_score")
          .eq("path_id", path.template_path_id)
          .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to load history detail steps")

  const typedTasks = (tasks ?? []) as HistoryTaskRow[]
  const xpByPathId = new Map([[path.id, typedTasks.reduce((sum, task) => sum + task.score_awarded, 0)]])
  const toolNameById = new Map(tool ? [[path.tool_id, (tool as ToolRow).name]] : [])
  const taskByStepId = new Map(typedTasks.map((task) => [task.path_step_id, task]))

  const detailSteps = ((steps ?? []) as StepRow[]).map((step) => {
    const task = taskByStepId.get(step.id)

    return {
      id: step.id,
      stepNo: step.step_no,
      title: step.title,
      status:
        task?.status === "completed"
          ? "completed"
          : task?.status === "in_progress"
            ? "in_progress"
            : task?.status === "blocked"
              ? "blocked"
              : "pending",
      rewardXp: task?.score_awarded ?? step.reward_score,
      completedAt: task?.completed_at ? toIsoDate(task.completed_at) : null,
    } satisfies LearningHistoryDetailStep
  })

  return {
    detail: {
      item: mapPathToHistoryItem(path, toolNameById, xpByPathId),
      timeline: {
        startedAt: toIsoDate(path.started_at),
        lastActivityAt: path.last_activity_at ? toIsoDate(path.last_activity_at) : null,
        completedAt: path.completed_at ? toIsoDate(path.completed_at) : null,
        interruptedAt: path.interrupted_at ? toIsoDate(path.interrupted_at) : null,
        abandonedAt: path.abandoned_at ? toIsoDate(path.abandoned_at) : null,
      },
      steps: detailSteps,
    },
  }
}

export async function updateHistoryPlanStatus(
  userId: string,
  pathId: string,
  action: HistoryPlanAction,
) {
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()
  const path = await loadPathById(userId, pathId)

  if (!path || path.status === "archived") {
    return null
  }

  const now = new Date().toISOString()

  if (action === "abandon") {
    if (path.status !== "active") {
      throw new Error("只有进行中的学习计划才可以放弃。")
    }

    const { error } = await supabase
      .from("user_learning_paths")
      .update({
        status: "abandoned",
        abandoned_at: now,
        updated_at: now,
      })
      .eq("id", path.id)
      .eq("user_id", userId)
      .eq("status", "active")

    assertSupabaseSuccess(error, "failed to abandon learning path")

    return {
      pathId: path.id,
      status: "abandoned" as const,
    }
  }

  if (action === "reactivate") {
    if (!["interrupted", "abandoned"].includes(path.status)) {
      throw new Error("只有已中断或已放弃的学习计划才可以重新激活。")
    }

    const summary = await getLearningPathStatusSummary(userId)
    if (summary.activeCount > 0 && summary.activePathId !== path.id) {
      const conflict = new Error("当前已有进行中的学习计划，请先完成或放弃当前计划。")
      conflict.name = "CONFLICT"
      throw conflict
    }

    const { error } = await supabase
      .from("user_learning_paths")
      .update({
        status: "active",
        interrupted_at: null,
        abandoned_at: null,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", path.id)
      .eq("user_id", userId)
      .in("status", ["interrupted", "abandoned"])

    assertSupabaseSuccess(error, "failed to reactivate learning path")

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        last_learning_at: now,
        updated_at: now,
      })
      .eq("user_id", userId)

    assertSupabaseSuccess(profileError, "failed to touch profile during path reactivation")

    return {
      pathId: path.id,
      status: "in_progress" as const,
    }
  }

  if (path.status === "active") {
    throw new Error("进行中的学习计划不能直接删除，请先放弃该计划。")
  }

  const { error } = await supabase
    .from("user_learning_paths")
    .update({
      status: "archived",
      updated_at: now,
    })
    .eq("id", path.id)
    .eq("user_id", userId)
    .in("status", ["completed", "interrupted", "abandoned"])

  assertSupabaseSuccess(error, "failed to archive learning path")

  return {
    pathId: path.id,
    status:
      path.status === "completed"
        ? ("completed" as const)
        : path.status === "interrupted"
          ? ("interrupted" as const)
          : ("abandoned" as const),
  }
}
