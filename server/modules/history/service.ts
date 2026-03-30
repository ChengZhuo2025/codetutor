import type { LearningHistoryResponseData } from "@/lib/api/contracts/history"
import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"

type HistoryPathRow = {
  id: string
  tool_id: string
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

type ToolRow = {
  id: string
  name: string
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
      "id, tool_id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, created_at, updated_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .in("status", ["active", "completed", "abandoned", "archived"])
    .order("updated_at", { ascending: false })
    .range(from, to)

  assertSupabaseSuccess(pathError, "failed to load history list")

  const historyPaths = (paths ?? []) as HistoryPathRow[]
  const pathIds = historyPaths.map((item) => item.id)
  const toolIds = Array.from(new Set(historyPaths.map((item) => item.tool_id)))
  const { data: tasks, error: taskError } =
    pathIds.length === 0
      ? { data: [] as HistoryTaskRow[], error: null }
      : await supabase
          .from("user_tasks")
          .select("user_learning_path_id, score_awarded")
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
    items: historyPaths.map((item) => ({
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
    })),
    total: count ?? historyPaths.length,
    page: safePage,
    hasMore: from + historyPaths.length < (count ?? historyPaths.length),
  }
}
