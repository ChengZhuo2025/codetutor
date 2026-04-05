import type {
  AdminLearningPathDetailResponseData,
  AdminLearningPathDetailStep,
  AdminLearningPathListItem,
  AdminLearningPathListResponseData,
  AdminLearningPathListStats,
  AdminLearningPathStatus,
  AdminLearningToolOption,
  AdminUpdateLearningPathStatusResponseData,
} from "@/lib/api/contracts/admin-learning"
import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import { getLearningLevelLabel, getSelectionModeLabel } from "@/constants/learning-taxonomy"
import { getRankName } from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import { isUuid } from "@/server/lib/identifiers"
import { getLearningPathStatusSummary } from "@/server/modules/learning-paths/service"
import { buildAdminLearningPathExportCsv } from "./export"

type LearningPathRow = {
  id: string
  user_id: string
  tool_id: string
  path_code_snapshot: string
  path_name_snapshot: string
  path_summary_snapshot: string | null
  learning_level: "beginner" | "intermediate" | "advanced"
  selection_mode: "self_directed" | "preset_training"
  status: AdminLearningPathStatus
  total_steps: number
  completed_steps: number
  started_at: string
  last_activity_at: string | null
  completed_at: string | null
  interrupted_at?: string | null
  abandoned_at: string | null
  updated_at: string
}

type UserProfileRow = {
  user_id: string
  nickname: string | null
  avatar_url: string | null
  contact_email: string | null
  current_score: number | null
  current_rank_code: string | null
  streak_days: number | null
  last_learning_at: string | null
}

type UserTaskRow = {
  id: string
  user_learning_path_id: string
  path_step_id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
  score_awarded: number
  completed_at: string | null
}

type ToolRow = {
  id: string
  code: string
  name: string
}

type StepRow = {
  id: string
  path_id: string
  step_no: number
  title: string
  reward_score: number
}

type SessionRow = {
  id: string
  user_learning_path_id: string | null
  status: string
  message_count: number
  started_at: string
  last_message_at: string | null
}

type MessageRow = {
  id: string
  session_id: string
  role: "system" | "developer" | "user" | "assistant" | "tool"
  sequence_no: number
  content_text: string | null
}

type ListFilters = {
  keyword?: string
  status: "all" | "active" | "interrupted" | "completed" | "abandoned"
  toolCode?: string
  learningLevel?: "beginner" | "intermediate" | "advanced"
  updatedWithin: "all" | "7d" | "30d" | "90d"
  limit: number
  page: number
}

const ADMIN_LEARNING_EXPORT_MAX_ROWS = 10_000

function escapeIlikeFragment(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function buildLearningKeywordOrClause(keyword: string, matchedUserIds: string[]) {
  const clauses: string[] = []
  const pattern = `%${escapeIlikeFragment(keyword)}%`

  clauses.push(`path_name_snapshot.ilike.${pattern}`)
  clauses.push(`path_code_snapshot.ilike.${pattern}`)

  if (isUuid(keyword)) {
    clauses.push(`id.eq.${keyword}`)
    clauses.push(`user_id.eq.${keyword}`)
  }

  if (matchedUserIds.length > 0) {
    clauses.push(`user_id.in.(${matchedUserIds.join(",")})`)
  }

  return clauses.join(",")
}

function getUpdatedWithinCutoff(updatedWithin: ListFilters["updatedWithin"]) {
  if (updatedWithin === "all") {
    return null
  }

  const days = updatedWithin === "7d" ? 7 : updatedWithin === "30d" ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

async function getToolMaps() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .order("name", { ascending: true })

  assertSupabaseSuccess(error, "failed to query learning tools for admin learning")

  const rows = (data ?? []) as ToolRow[]
  return {
    toolOptions: rows.map((row) => ({ code: row.code, name: row.name })) satisfies AdminLearningToolOption[],
    toolById: new Map(rows.map((row) => [row.id, row])),
    toolIdByCode: new Map(rows.map((row) => [row.code, row.id])),
  }
}

async function findKeywordMatchedUserIds(keyword: string) {
  const supabase = createSupabaseAdminClient()
  const pattern = `%${escapeIlikeFragment(keyword)}%`
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id")
    .or(`nickname.ilike.${pattern},contact_email.ilike.${pattern}`)
    .limit(200)

  assertSupabaseSuccess(error, "failed to query admin learning keyword matched users")
  return (data ?? []).map((row) => String((row as { user_id: string }).user_id))
}

function applyLearningKeywordFilter(
  query: unknown,
  keyword: string | undefined,
  matchedUserIds: string[],
) {
  const q = query as { or: (clause: string) => unknown }
  const normalized = keyword?.trim()
  if (!normalized) {
    return q
  }

  return q.or(buildLearningKeywordOrClause(normalized, matchedUserIds))
}

function applyLearningPathFilters(
  query: unknown,
  filters: Pick<ListFilters, "status" | "toolCode" | "learningLevel" | "updatedWithin"> & {
    toolIdByCode: Map<string, string>
  },
) {
  let q = query as {
    neq: (column: string, value: string) => unknown
    eq: (column: string, value: string) => unknown
    gte: (column: string, value: string) => unknown
  }

  q = q.neq("status", "archived") as typeof q

  if (filters.status !== "all") {
    q = q.eq("status", filters.status) as typeof q
  }

  if (filters.learningLevel) {
    q = q.eq("learning_level", filters.learningLevel) as typeof q
  }

  if (filters.toolCode) {
    const toolId = filters.toolIdByCode.get(filters.toolCode)
    if (toolId) {
      q = q.eq("tool_id", toolId) as typeof q
    } else {
      q = q.eq("tool_id", "__missing_tool__") as typeof q
    }
  }

  const cutoff = getUpdatedWithinCutoff(filters.updatedWithin)
  if (cutoff) {
    q = q.gte("updated_at", cutoff) as typeof q
  }

  return q
}

async function getAdminLearningStats(): Promise<AdminLearningPathListStats> {
  const supabase = createSupabaseAdminClient()
  const base = () => supabase.from("user_learning_paths").select("*", { count: "exact", head: true }).neq("status", "archived")

  const [total, active, interrupted, completed, abandoned] = await Promise.all([
    base(),
    base().eq("status", "active"),
    base().eq("status", "interrupted"),
    base().eq("status", "completed"),
    base().eq("status", "abandoned"),
  ])

  assertSupabaseSuccess(total.error, "failed to count total learning paths")
  assertSupabaseSuccess(active.error, "failed to count active learning paths")
  assertSupabaseSuccess(interrupted.error, "failed to count interrupted learning paths")
  assertSupabaseSuccess(completed.error, "failed to count completed learning paths")
  assertSupabaseSuccess(abandoned.error, "failed to count abandoned learning paths")

  return {
    totalPaths: total.count ?? 0,
    activeCount: active.count ?? 0,
    interruptedCount: interrupted.count ?? 0,
    completedCount: completed.count ?? 0,
    abandonedCount: abandoned.count ?? 0,
  }
}

function buildTaskStatsMap(rows: UserTaskRow[]) {
  const map = new Map<string, {
    totalTaskCount: number
    completedTaskCount: number
    inProgressTaskCount: number
    blockedTaskCount: number
    pendingTaskCount: number
    xpEarned: number
  }>()

  for (const row of rows) {
    const next = map.get(row.user_learning_path_id) ?? {
      totalTaskCount: 0,
      completedTaskCount: 0,
      inProgressTaskCount: 0,
      blockedTaskCount: 0,
      pendingTaskCount: 0,
      xpEarned: 0,
    }

    next.totalTaskCount += 1
    next.xpEarned += row.score_awarded ?? 0

    if (row.status === "completed") {
      next.completedTaskCount += 1
    } else if (row.status === "in_progress") {
      next.inProgressTaskCount += 1
    } else if (row.status === "blocked") {
      next.blockedTaskCount += 1
    } else if (row.status === "not_started") {
      next.pendingTaskCount += 1
    }

    map.set(row.user_learning_path_id, next)
  }

  return map
}

function mapListItem(
  row: LearningPathRow,
  profile: UserProfileRow | null,
  tool: ToolRow | undefined,
  taskStats: ReturnType<typeof buildTaskStatsMap>,
): AdminLearningPathListItem {
  const stats = taskStats.get(row.id) ?? {
    totalTaskCount: 0,
    completedTaskCount: 0,
    inProgressTaskCount: 0,
    blockedTaskCount: 0,
    pendingTaskCount: 0,
    xpEarned: 0,
  }

  return {
    pathId: row.id,
    userId: row.user_id,
    userNickname: profile?.nickname ?? null,
    userAvatarUrl: profile?.avatar_url ?? null,
    userEmail: profile?.contact_email ?? null,
    toolCode: tool?.code ?? "",
    toolName: tool?.name ?? "未知工具",
    pathCode: row.path_code_snapshot,
    pathName: row.path_name_snapshot,
    learningLevel: row.learning_level,
    learningLevelLabel: getLearningLevelLabel(row.learning_level, "short"),
    selectionMode: row.selection_mode,
    selectionModeLabel: getSelectionModeLabel(row.selection_mode, "short"),
    status: row.status === "archived" ? "completed" : row.status,
    progressPercent: row.total_steps > 0 ? Math.round((row.completed_steps / row.total_steps) * 100) : 0,
    completedTaskCount: stats.completedTaskCount,
    inProgressTaskCount: stats.inProgressTaskCount,
    blockedTaskCount: stats.blockedTaskCount,
    totalTaskCount: stats.totalTaskCount,
    xpEarned: stats.xpEarned,
    startedAt: toIsoDate(row.started_at),
    lastLearningAt: profile?.last_learning_at ? toIsoDate(profile.last_learning_at) : null,
    updatedAt: toIsoDate(row.updated_at),
  }
}

async function fetchLearningPathRows(filters: ListFilters, forExport = false) {
  const supabase = createSupabaseAdminClient()
  const { toolById, toolIdByCode, toolOptions } = await getToolMaps()
  const page = Math.max(1, filters.page)
  const limit = forExport ? ADMIN_LEARNING_EXPORT_MAX_ROWS : Math.max(1, Math.min(100, filters.limit))
  const from = forExport ? 0 : (page - 1) * limit
  const to = forExport ? limit - 1 : from + limit - 1
  const keyword = filters.keyword?.trim()
  const matchedUserIds = keyword ? await findKeywordMatchedUserIds(keyword) : []

  const baseCountQuery = supabase.from("user_learning_paths").select("*", { count: "exact", head: true })
  let countQuery: unknown = baseCountQuery
  countQuery = applyLearningPathFilters(countQuery, {
    status: filters.status,
    toolCode: filters.toolCode,
    learningLevel: filters.learningLevel,
    updatedWithin: filters.updatedWithin,
    toolIdByCode,
  })
  countQuery = applyLearningKeywordFilter(countQuery, keyword, matchedUserIds)

  const countResult = await countQuery as Awaited<typeof baseCountQuery>
  assertSupabaseSuccess(countResult.error, "failed to count admin learning paths")

  if (forExport && (countResult.count ?? 0) > ADMIN_LEARNING_EXPORT_MAX_ROWS) {
    throw new Error("LEARNING_EXPORT_LIMIT_EXCEEDED")
  }

  const baseQuery = supabase
    .from("user_learning_paths")
    .select("id, user_id, tool_id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, started_at, last_activity_at, completed_at, abandoned_at, updated_at, interrupted_at")
    .order("updated_at", { ascending: false })
    .range(from, to)

  let query: unknown = baseQuery
  query = applyLearningPathFilters(query, {
    status: filters.status,
    toolCode: filters.toolCode,
    learningLevel: filters.learningLevel,
    updatedWithin: filters.updatedWithin,
    toolIdByCode,
  })
  query = applyLearningKeywordFilter(query, keyword, matchedUserIds)

  const { data, error } = await query as Awaited<typeof baseQuery>
  assertSupabaseSuccess(error, "failed to query admin learning paths")

  const rows = (data ?? []) as LearningPathRow[]
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)))
  const pathIds = rows.map((row) => row.id)

  const [{ data: profiles, error: profileError }, { data: tasks, error: taskError }] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve({ data: [] as UserProfileRow[], error: null })
      : supabase
          .from("user_profiles")
          .select("user_id, nickname, avatar_url, contact_email, current_score, current_rank_code, streak_days, last_learning_at")
          .in("user_id", userIds),
    pathIds.length === 0
      ? Promise.resolve({ data: [] as UserTaskRow[], error: null })
      : supabase
          .from("user_tasks")
          .select("id, user_learning_path_id, path_step_id, status, score_awarded, completed_at")
          .in("user_learning_path_id", pathIds),
  ])

  assertSupabaseSuccess(profileError, "failed to load admin learning profiles")
  assertSupabaseSuccess(taskError, "failed to load admin learning task stats")

  const profileByUserId = new Map(((profiles ?? []) as UserProfileRow[]).map((row) => [row.user_id, row]))
  const taskStats = buildTaskStatsMap((tasks ?? []) as UserTaskRow[])

  return {
    rows,
    total: countResult.count ?? 0,
    page,
    limit,
    items: rows.map((row) => mapListItem(row, profileByUserId.get(row.user_id) ?? null, toolById.get(row.tool_id), taskStats)),
    toolOptions,
  }
}

async function writeAdminLearningAudit(input: {
  adminAccountId: string
  action: AdminAuditAction
  pathId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  reason?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: "user_learning_path",
    target_id: input.pathId,
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    reason: input.reason ?? null,
    request_context: null,
  })

  if (error) {
    console.error("Failed to write admin learning audit log:", error)
  }
}

async function getPathRowById(pathId: string) {
  if (!isUuid(pathId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, user_id, tool_id, path_code_snapshot, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, status, total_steps, completed_steps, started_at, last_activity_at, completed_at, abandoned_at, updated_at, interrupted_at")
    .eq("id", pathId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin learning path detail")
  return (data as LearningPathRow | null) ?? null
}

export async function getAdminLearningPathList(filters: ListFilters): Promise<AdminLearningPathListResponseData> {
  const [{ items, total, page, limit, toolOptions }, stats] = await Promise.all([
    fetchLearningPathRows(filters),
    getAdminLearningStats(),
  ])

  return {
    items,
    total,
    page,
    limit,
    stats,
    toolOptions,
  }
}

export async function getAdminLearningPathExportCsv(
  filters: Omit<ListFilters, "page" | "limit">,
) {
  const { items } = await fetchLearningPathRows(
    {
      ...filters,
      page: 1,
      limit: ADMIN_LEARNING_EXPORT_MAX_ROWS,
    },
    true,
  )

  const csv = buildAdminLearningPathExportCsv(items)
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  return { csv, filename: `admin-learning-paths-${ts}.csv` }
}

export async function getAdminLearningPathDetail(
  pathId: string,
): Promise<AdminLearningPathDetailResponseData | null> {
  const path = await getPathRowById(pathId)
  if (!path) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const [{ toolById }, { data: profileData, error: profileError }, { data: taskData, error: taskError }, { data: sessionData, error: sessionError }] = await Promise.all([
    getToolMaps(),
    supabase
      .from("user_profiles")
      .select("user_id, nickname, avatar_url, contact_email, current_score, current_rank_code, streak_days, last_learning_at")
      .eq("user_id", path.user_id)
      .maybeSingle(),
    supabase
      .from("user_tasks")
      .select("id, user_learning_path_id, path_step_id, status, score_awarded, completed_at")
      .eq("user_learning_path_id", path.id),
    supabase
      .from("conversation_sessions")
      .select("id, user_learning_path_id, status, message_count, started_at, last_message_at")
      .eq("user_learning_path_id", path.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  assertSupabaseSuccess(profileError, "failed to query admin learning detail profile")
  assertSupabaseSuccess(taskError, "failed to query admin learning detail tasks")
  assertSupabaseSuccess(sessionError, "failed to query admin learning detail sessions")

  const profile = (profileData as UserProfileRow | null) ?? null
  const tasks = (taskData ?? []) as UserTaskRow[]
  const sessions = (sessionData ?? []) as SessionRow[]
  const taskStats = buildTaskStatsMap(tasks).get(path.id) ?? {
    totalTaskCount: 0,
    completedTaskCount: 0,
    inProgressTaskCount: 0,
    blockedTaskCount: 0,
    pendingTaskCount: 0,
    xpEarned: 0,
  }

  const stepIds = Array.from(new Set(tasks.map((task) => task.path_step_id)))
  const { data: stepData, error: stepError } =
    stepIds.length === 0
      ? { data: [] as StepRow[], error: null }
      : await supabase
          .from("path_steps")
          .select("id, path_id, step_no, title, reward_score")
          .in("id", stepIds)
          .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to query admin learning detail steps")

  const messagesBySessionId = new Map<string, MessageRow[]>()
  const sessionIds = sessions.map((session) => session.id)
  const { data: messageData, error: messageError } =
    sessionIds.length === 0
      ? { data: [] as MessageRow[], error: null }
      : await supabase
          .from("conversation_messages")
          .select("id, session_id, role, sequence_no, content_text")
          .in("session_id", sessionIds)
          .eq("role", "assistant")
          .order("sequence_no", { ascending: false })

  assertSupabaseSuccess(messageError, "failed to query admin learning detail messages")

  for (const row of (messageData ?? []) as MessageRow[]) {
    const bucket = messagesBySessionId.get(row.session_id) ?? []
    bucket.push(row)
    messagesBySessionId.set(row.session_id, bucket)
  }

  const taskByStepId = new Map(tasks.map((task) => [task.path_step_id, task]))
  const steps: AdminLearningPathDetailStep[] = ((stepData ?? []) as StepRow[]).map((step) => {
    const task = taskByStepId.get(step.id)
    return {
      stepId: step.id,
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
    }
  })

  return {
    pathId: path.id,
    user: {
      userId: path.user_id,
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email: profile?.contact_email ?? null,
      currentScore: profile?.current_score ?? 0,
      currentRankLabel: getRankName(profile?.current_rank_code ?? "rookie"),
      streakDays: profile?.streak_days ?? 0,
      lastLearningAt: profile?.last_learning_at ? toIsoDate(profile.last_learning_at) : null,
    },
    path: {
      pathCode: path.path_code_snapshot,
      pathName: path.path_name_snapshot,
      summary: path.path_summary_snapshot,
      toolCode: toolById.get(path.tool_id)?.code ?? "",
      toolName: toolById.get(path.tool_id)?.name ?? "未知工具",
      learningLevel: path.learning_level,
      learningLevelLabel: getLearningLevelLabel(path.learning_level, "short"),
      selectionMode: path.selection_mode,
      selectionModeLabel: getSelectionModeLabel(path.selection_mode, "short"),
      status: path.status,
      totalSteps: path.total_steps,
      completedSteps: path.completed_steps,
      progressPercent: path.total_steps > 0 ? Math.round((path.completed_steps / path.total_steps) * 100) : 0,
      totalTaskCount: taskStats.totalTaskCount,
      completedTaskCount: taskStats.completedTaskCount,
      inProgressTaskCount: taskStats.inProgressTaskCount,
      blockedTaskCount: taskStats.blockedTaskCount,
      pendingTaskCount: taskStats.pendingTaskCount,
      xpEarned: taskStats.xpEarned,
    },
    timeline: {
      startedAt: toIsoDate(path.started_at),
      lastActivityAt: path.last_activity_at ? toIsoDate(path.last_activity_at) : null,
      completedAt: path.completed_at ? toIsoDate(path.completed_at) : null,
      interruptedAt: path.interrupted_at ? toIsoDate(path.interrupted_at) : null,
      abandonedAt: path.abandoned_at ? toIsoDate(path.abandoned_at) : null,
      archivedAt: path.status === "archived" ? toIsoDate(path.updated_at) : null,
    },
    steps,
    recentSessions: sessions.map((session) => ({
      sessionId: session.id,
      status: session.status,
      startedAt: toIsoDate(session.started_at),
      lastMessageAt: session.last_message_at ? toIsoDate(session.last_message_at) : null,
      messageCount: session.message_count,
      latestAssistantSummary:
        messagesBySessionId.get(session.id)?.find((message) => message.content_text && message.content_text.trim().length > 0)?.content_text?.trim().slice(0, 120) ?? null,
    })),
  }
}

export async function updateAdminLearningPathStatus(
  adminAccountId: string,
  pathId: string,
  input: {
    action: "reactivate" | "archive"
    reason?: string | null
  },
): Promise<AdminUpdateLearningPathStatusResponseData | null> {
  const path = await getPathRowById(pathId)
  if (!path) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const beforeSnapshot = {
    status: path.status,
    interruptedAt: path.interrupted_at ?? null,
    abandonedAt: path.abandoned_at ?? null,
    completedAt: path.completed_at ?? null,
  }

  if (input.action === "reactivate") {
    if (path.status !== "interrupted") {
      throw new Error("只有已中断的学习计划才可以重新激活。")
    }

    const summary = await getLearningPathStatusSummary(path.user_id)
    if (summary.activeCount > 0 && summary.activePathId !== path.id) {
      const error = new Error("当前已有进行中的学习计划，请先完成或放弃当前计划。")
      error.name = "CONFLICT"
      throw error
    }

    const { error } = await supabase
      .from("user_learning_paths")
      .update({
        status: "active",
        interrupted_at: null,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", path.id)
      .eq("status", "interrupted")

    assertSupabaseSuccess(error, "failed to admin-reactivate learning path")

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        last_learning_at: now,
        updated_at: now,
      })
      .eq("user_id", path.user_id)

    assertSupabaseSuccess(profileError, "failed to touch profile during admin reactivation")

    await writeAdminLearningAudit({
      adminAccountId,
      action: "learning_path_status_update",
      pathId: path.id,
      beforeSnapshot,
      afterSnapshot: {
        status: "active",
        interruptedAt: null,
      },
      reason: input.reason,
    })

    return {
      pathId: path.id,
      status: "active",
    }
  }

  if (path.status === "archived") {
    throw new Error("该学习计划已归档。")
  }

  if (path.status === "active") {
    throw new Error("进行中的学习计划不能直接归档，请先由用户完成或放弃该计划。")
  }

  const { error } = await supabase
    .from("user_learning_paths")
    .update({
      status: "archived",
      updated_at: now,
    })
    .eq("id", path.id)
    .in("status", ["completed", "interrupted", "abandoned"])

  assertSupabaseSuccess(error, "failed to admin-archive learning path")

  await writeAdminLearningAudit({
    adminAccountId,
    action: "learning_path_status_update",
    pathId: path.id,
    beforeSnapshot,
    afterSnapshot: {
      status: "archived",
    },
    reason: input.reason,
  })

  return {
    pathId: path.id,
    status: "archived",
  }
}
