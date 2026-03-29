import type { LearningHistoryResponseData } from "@/lib/api/contracts/history"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"

type HistoryPathRow = {
  id: string
  path_code_snapshot: string
  path_name_snapshot: string
  path_summary_snapshot: string | null
  learning_level: "beginner" | "intermediate" | "advanced"
  selection_mode: "self_directed" | "preset_training"
  status: "active" | "completed" | "abandoned" | "archived"
  total_steps: number
  completed_steps: number
  created_at: string
  updated_at: string
}

type HistoryTaskRow = {
  user_learning_path_id: string
  score_awarded: number
}

const LEVEL_LABEL_MAP: Record<string, string> = {
  beginner: "零基础",
  intermediate: "有基础",
  advanced: "进阶",
}

const MODE_LABEL_MAP: Record<string, string> = {
  self_directed: "自由模式",
  preset_training: "闯关模式",
}

const HISTORY_STATUS_MAP: Record<string, "in_progress" | "completed" | "abandoned"> = {
  active: "in_progress",
  completed: "completed",
  abandoned: "abandoned",
  archived: "completed",
}

export async function getRecentHistoryData(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<LearningHistoryResponseData> {
  const supabase = createSupabaseAdminClient()
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(50, Math.max(1, pageSize))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  const { data: paths, error: pathError, count } = await supabase
    .from("user_learning_paths")
    .select(
      "id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, created_at, updated_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .in("status", ["active", "completed", "abandoned", "archived"])
    .order("updated_at", { ascending: false })
    .range(from, to)

  assertSupabaseSuccess(pathError, "failed to load history list")

  const historyPaths = (paths ?? []) as HistoryPathRow[]
  const pathIds = historyPaths.map((item) => item.id)
  const { data: tasks, error: taskError } =
    pathIds.length === 0
      ? { data: [] as HistoryTaskRow[], error: null }
      : await supabase
          .from("user_tasks")
          .select("user_learning_path_id, score_awarded")
          .in("user_learning_path_id", pathIds)

  assertSupabaseSuccess(taskError, "failed to load history task summaries")

  const xpByPathId = new Map<string, number>()

  for (const task of (tasks ?? []) as HistoryTaskRow[]) {
    xpByPathId.set(
      task.user_learning_path_id,
      (xpByPathId.get(task.user_learning_path_id) ?? 0) + task.score_awarded,
    )
  }

  return {
    items: historyPaths.map((item) => ({
      id: item.id,
      planId: item.path_code_snapshot,
      title: item.path_name_snapshot,
      summary: item.path_summary_snapshot ?? "",
      tool: item.path_name_snapshot.split(" ")[0] ?? "未知工具",
      level: LEVEL_LABEL_MAP[item.learning_level] ?? item.learning_level,
      mode: MODE_LABEL_MAP[item.selection_mode] ?? item.selection_mode,
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
    })),
    total: count ?? historyPaths.length,
    page: safePage,
    hasMore: from + historyPaths.length < (count ?? historyPaths.length),
  }
}
