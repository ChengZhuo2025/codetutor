// 管理员看板服务
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type {
  AdminDashboardAiHealthItem,
  AdminDashboardDayActivePoint,
  AdminDashboardFeedbackRow,
  AdminDashboardHourlyPoint,
  AdminDashboardMetric,
  AdminDashboardOverviewResponseData,
  AdminDashboardTrend,
  AdminRoleCode,
} from "@/lib/api/contracts/admin"
import type { FeedbackStatus, FeedbackType } from "@/lib/api/contracts/feedback"

const FEEDBACK_TYPE_LABEL_MAP: Record<FeedbackType, string> = {
  visual_design: "界面视觉",
  interaction_flow: "交互流程",
  feature_request: "功能建议",
  issue_report: "问题反馈",
}

const FEEDBACK_STATUS_LABEL_MAP: Record<FeedbackStatus, string> = {
  submitted: "待处理",
  in_review: "处理中",
  replied: "已回复",
  closed: "已关闭",
}

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function getMonday(d: Date): Date {
  const x = startOfLocalDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatRelativeTimeZh(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) {
    return "刚刚"
  }
  const m = Math.floor(diff / 60_000)
  if (m < 60) {
    return `${m} 分钟前`
  }
  const h = Math.floor(m / 60)
  if (h < 24) {
    return `${h} 小时前`
  }
  const days = Math.floor(h / 24)
  return `${days} 天前`
}

function countComparison(today: number, yesterday: number): Pick<AdminDashboardMetric, "trend" | "comparisonLabel"> {
  if (yesterday === 0 && today === 0) {
    return { trend: "neutral", comparisonLabel: null }
  }
  if (yesterday === 0) {
    return {
      trend: today > 0 ? "up" : "neutral",
      comparisonLabel: today > 0 ? "+100%" : null,
    }
  }
  const pct = ((today - yesterday) / yesterday) * 100
  const rounded = Math.round(pct * 10) / 10
  const sign = rounded > 0 ? "+" : ""
  const trend: AdminDashboardTrend = rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral"
  return { trend, comparisonLabel: `${sign}${rounded}%` }
}

function stockMetric(value: number): AdminDashboardMetric {
  return { value, trend: "neutral", comparisonLabel: null }
}

function canAccessAdminAiDashboard(roles: AdminRoleCode[]) {
  return roles.includes("super_admin") || roles.includes("ai_ops_admin")
}

async function loadAdminRoleCodes(adminAccountId: string): Promise<AdminRoleCode[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_account_roles")
    .select("admin_roles ( code )")
    .eq("admin_account_id", adminAccountId)

  assertSupabaseSuccess(error, "failed to load admin roles")

  const rows = (data ?? []) as unknown as Array<{
    admin_roles: { code: string } | { code: string }[] | null
  }>
  const codes: AdminRoleCode[] = []
  for (const r of rows) {
    const ar = r.admin_roles
    if (!ar) {
      continue
    }
    if (Array.isArray(ar)) {
      for (const x of ar) {
        if (typeof x?.code === "string") {
          codes.push(x.code as AdminRoleCode)
        }
      }
    } else if (typeof ar.code === "string") {
      codes.push(ar.code as AdminRoleCode)
    }
  }

  return codes
}

type InvocationRow = {
  created_at: string
  status: string
  latency_ms: number | null
  model_code: string
  provider_code: string
}

function successRate(rows: InvocationRow[]): number {
  if (rows.length === 0) {
    return 0
  }
  const ok = rows.filter((r) => r.status === "succeeded").length
  return Math.round((ok / rows.length) * 1000) / 10
}

function avgLatencyMs(rows: InvocationRow[]): number {
  const latencies = rows
    .filter((r) => r.status === "succeeded" && typeof r.latency_ms === "number" && r.latency_ms >= 0)
    .map((r) => r.latency_ms as number)
  if (latencies.length === 0) {
    return 0
  }
  return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
}

function buildHourlySuccess(rows: InvocationRow[], since: Date): AdminDashboardHourlyPoint[] {
  const buckets: InvocationRow[][] = Array.from({ length: 24 }, () => [])
  const start = since.getTime()
  const hourMs = 60 * 60 * 1000

  for (const row of rows) {
    const t = new Date(row.created_at).getTime()
    if (t < start) {
      continue
    }
    const idx = Math.min(23, Math.floor((t - start) / hourMs))
    buckets[idx]?.push(row)
  }

  return buckets.map((bucket, i) => {
    const hour = new Date(start + i * hourMs)
    const label = `${String(hour.getHours()).padStart(2, "0")}:00`
    return {
      time: label,
      successRate: bucket.length === 0 ? 0 : successRate(bucket),
    }
  })
}

function buildAiHealth(rows: InvocationRow[], now: number): AdminDashboardAiHealthItem[] {
  type Key = string
  const byKey = new Map<Key, InvocationRow[]>()
  for (const row of rows) {
    const t = new Date(row.created_at).getTime()
    if (now - t > 24 * 60 * 60 * 1000) {
      continue
    }
    const key = `${row.provider_code}::${row.model_code}`
    const list = byKey.get(key) ?? []
    list.push(row)
    byKey.set(key, list)
  }

  const warnings: AdminDashboardAiHealthItem[] = []
  const normals: AdminDashboardAiHealthItem[] = []

  for (const [key, list] of byKey) {
    const [providerCode, modelCode] = key.split("::")
    if (!providerCode || !modelCode || list.length < 3) {
      continue
    }
    const rate = successRate(list)
    const avg = avgLatencyMs(list)
    const failRate = 100 - rate
    const latest = list.reduce((a, b) => (a > b.created_at ? a : b.created_at), list[0]!.created_at)

    if (failRate >= 3 || (avg > 0 && avg > 3000)) {
      const parts: string[] = []
      if (failRate >= 3) {
        parts.push(`错误率约 ${failRate.toFixed(1)}%`)
      }
      if (avg > 3000) {
        parts.push(`平均延迟 ${avg}ms`)
      }
      warnings.push({
        modelCode,
        providerCode,
        message: parts.join("；"),
        severity: "warning",
        relativeTime: formatRelativeTimeZh(latest),
      })
    } else if (rate >= 97) {
      normals.push({
        modelCode,
        providerCode,
        message: "服务正常",
        severity: "info",
        relativeTime: formatRelativeTimeZh(latest),
      })
    }
  }

  const merged = [...warnings, ...normals]
  return merged.slice(0, 5)
}

/**
 * 获取总览看板数据
 */
export async function getDashboardOverview(adminAccountId: string): Promise<AdminDashboardOverviewResponseData> {
  const supabase = createSupabaseAdminClient()
  const roles = await loadAdminRoleCodes(adminAccountId)
  const canViewAiCharts = canAccessAdminAiDashboard(roles)

  const now = new Date()
  const todayStart = startOfLocalDay(now)
  const tomorrowStart = addDays(todayStart, 1)
  const yesterdayStart = addDays(todayStart, -1)

  const todayStartIso = todayStart.toISOString()
  const tomorrowStartIso = tomorrowStart.toISOString()
  const yesterdayStartIso = yesterdayStart.toISOString()

  const todayCheckinDate = localDateKey(todayStart)
  const yesterdayCheckinDate = localDateKey(yesterdayStart)

  const [
    pendingToday,
    newUsersToday,
    newUsersYesterday,
    tasksToday,
    tasksYesterday,
    pathsActive,
    onboardingToday,
    onboardingYesterday,
    checkinsToday,
    checkinsYesterday,
    feedbackRows,
  ] = await Promise.all([
    supabase
      .from("feedback_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", todayStartIso)
      .lt("created_at", tomorrowStartIso),
    supabase
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", yesterdayStartIso)
      .lt("created_at", todayStartIso),
    supabase
      .from("user_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", todayStartIso)
      .lt("completed_at", tomorrowStartIso),
    supabase
      .from("user_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", yesterdayStartIso)
      .lt("completed_at", todayStartIso),
    supabase
      .from("user_learning_paths")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("user_learning_preferences")
      .select("user_id", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .gte("updated_at", todayStartIso)
      .lt("updated_at", tomorrowStartIso),
    supabase
      .from("user_learning_preferences")
      .select("user_id", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .gte("updated_at", yesterdayStartIso)
      .lt("updated_at", todayStartIso),
    supabase
      .from("daily_checkins")
      .select("user_id", { count: "exact", head: true })
      .eq("checkin_date", todayCheckinDate),
    supabase
      .from("daily_checkins")
      .select("user_id", { count: "exact", head: true })
      .eq("checkin_date", yesterdayCheckinDate),
    supabase
      .from("feedback_tickets")
      .select(
        "id, user_id, feedback_type, status, priority, user_nickname_snapshot, submitted_at",
      )
      .order("submitted_at", { ascending: false })
      .limit(5),
  ])

  assertSupabaseSuccess(pendingToday.error, "failed to query pending feedback")
  assertSupabaseSuccess(newUsersToday.error, "failed to query today new users")
  assertSupabaseSuccess(newUsersYesterday.error, "failed to query yesterday new users")
  assertSupabaseSuccess(tasksToday.error, "failed to query today completed tasks")
  assertSupabaseSuccess(tasksYesterday.error, "failed to query yesterday completed tasks")
  assertSupabaseSuccess(pathsActive.error, "failed to query active learning paths")
  assertSupabaseSuccess(onboardingToday.error, "failed to query onboarding completed today")
  assertSupabaseSuccess(onboardingYesterday.error, "failed to query onboarding completed yesterday")
  assertSupabaseSuccess(checkinsToday.error, "failed to query today checkins")
  assertSupabaseSuccess(checkinsYesterday.error, "failed to query yesterday checkins")
  assertSupabaseSuccess(feedbackRows.error, "failed to query recent feedback")

  const pendingFeedbackCount = pendingToday.count ?? 0
  const todayNewUserCount = newUsersToday.count ?? 0
  const todayCompletedTaskCount = tasksToday.count ?? 0
  const activeLearningPathCount = pathsActive.count ?? 0
  const todayOnboardingCompletedCount = onboardingToday.count ?? 0

  const checkinToday = checkinsToday.count ?? 0
  const checkinYesterday = checkinsYesterday.count ?? 0

  const recentFeedback: AdminDashboardFeedbackRow[] = (feedbackRows.data ?? []).map(
    (row: {
      id: string
      user_id: string
      feedback_type: FeedbackType
      status: FeedbackStatus
      priority: "low" | "medium" | "high"
      user_nickname_snapshot: string | null
      submitted_at: string
    }) => ({
      id: row.id,
      userLabel: row.user_nickname_snapshot?.trim() || `user_${row.user_id.slice(0, 8)}`,
      typeLabel: FEEDBACK_TYPE_LABEL_MAP[row.feedback_type] ?? row.feedback_type,
      statusLabel: FEEDBACK_STATUS_LABEL_MAP[row.status] ?? row.status,
      priority: row.priority,
      relativeTime: formatRelativeTimeZh(row.submitted_at),
    }),
  )

  const monday = getMonday(now)
  const nextMonday = addDays(monday, 7)
  const eventSince = monday.toISOString()
  const eventUntil = nextMonday.toISOString()

  const { data: eventRows, error: eventError } = await supabase
    .from("event_logs")
    .select("user_id, occurred_at")
    .gte("occurred_at", eventSince)
    .lt("occurred_at", eventUntil)
    .not("user_id", "is", null)

  assertSupabaseSuccess(eventError, "failed to query event logs for weekly active")

  const byDay = new Map<string, Set<string>>()
  for (const row of eventRows ?? []) {
    const r = row as { user_id: string; occurred_at: string }
    const d = new Date(r.occurred_at)
    const key = localDateKey(d)
    const set = byDay.get(key) ?? new Set<string>()
    set.add(r.user_id)
    byDay.set(key, set)
  }

  const weeklyActiveByDay: AdminDashboardDayActivePoint[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    const key = localDateKey(d)
    weeklyActiveByDay.push({
      day: WEEKDAY_LABELS[i] ?? `D${i}`,
      activeUsers: byDay.get(key)?.size ?? 0,
    })
  }

  let aiHourlySuccess: AdminDashboardHourlyPoint[] | null = null
  let aiHealth: AdminDashboardAiHealthItem[] | null = null
  let aiSuccessMetric: AdminDashboardMetric | null = null
  let aiLatencyMetric: AdminDashboardMetric | null = null

  if (canViewAiCharts) {
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: invData, error: invError } = await supabase
      .from("llm_invocations")
      .select("created_at, status, latency_ms, model_code, provider_code")
      .gte("created_at", since48h)

    assertSupabaseSuccess(invError, "failed to query llm invocations")

    const invocations = (invData ?? []) as InvocationRow[]
    const last24 = Date.now() - 24 * 60 * 60 * 1000
    const prev48 = Date.now() - 48 * 60 * 60 * 1000

    const sliceLast24 = invocations.filter((r) => new Date(r.created_at).getTime() >= last24)
    const slicePrev24 = invocations.filter((r) => {
      const t = new Date(r.created_at).getTime()
      return t >= prev48 && t < last24
    })

    const rateNow = successRate(sliceLast24)
    const ratePrev = successRate(slicePrev24)
    const latNow = avgLatencyMs(sliceLast24)
    const latPrev = avgLatencyMs(slicePrev24)

    const diffPoints = Math.round((rateNow - ratePrev) * 10) / 10
    const signPts = diffPoints > 0 ? "+" : ""
    aiSuccessMetric = {
      value: rateNow,
      trend: diffPoints > 0 ? "up" : diffPoints < 0 ? "down" : "neutral",
      comparisonLabel: slicePrev24.length === 0 && sliceLast24.length === 0 ? null : `${signPts}${diffPoints}%`,
    }

    const diffMs = latPrev > 0 && latNow > 0 ? Math.round(latNow - latPrev) : latPrev === 0 && latNow > 0 ? null : latNow > 0 || latPrev > 0 ? Math.round(latNow - latPrev) : null

    let latencyTrend: AdminDashboardTrend = "neutral"
    let latencyLabel: string | null = null
    if (diffMs !== null && diffMs !== 0) {
      latencyTrend = diffMs < 0 ? "up" : "down"
      latencyLabel = `${diffMs > 0 ? "+" : ""}${diffMs}ms`
    } else if (latNow === 0 && latPrev === 0) {
      latencyLabel = null
    }

    aiLatencyMetric = {
      value: latNow,
      trend: latencyTrend,
      comparisonLabel: latencyLabel,
    }

    const since24h = new Date(last24)
    aiHourlySuccess = buildHourlySuccess(invocations, since24h)
    aiHealth = buildAiHealth(invocations, Date.now())
  }

  const metrics: AdminDashboardOverviewResponseData["metrics"] = {
    todayNewUsers: {
      value: todayNewUserCount,
      ...countComparison(todayNewUserCount, newUsersYesterday.count ?? 0),
    },
    todayOnboardingCompleted: {
      value: todayOnboardingCompletedCount,
      ...countComparison(todayOnboardingCompletedCount, onboardingYesterday.count ?? 0),
    },
    activeLearningPaths: stockMetric(activeLearningPathCount),
    todayCompletedTasks: {
      value: todayCompletedTaskCount,
      ...countComparison(todayCompletedTaskCount, tasksYesterday.count ?? 0),
    },
    todayCheckinUsers: {
      value: checkinToday,
      ...countComparison(checkinToday, checkinYesterday),
    },
    pendingFeedback: stockMetric(pendingFeedbackCount),
    aiSuccessRate24h: aiSuccessMetric,
    aiAvgLatencyMs24h: aiLatencyMetric,
  }

  return {
    generatedAt: now.toISOString(),
    pendingFeedbackCount,
    todayNewUserCount,
    todayCompletedTaskCount,
    activeLearningPathCount,
    todayCheckinCount: checkinToday,
    todayOnboardingCompletedCount,
    metrics,
    aiHourlySuccess,
    weeklyActiveByDay,
    weeklyActiveSubtitle: "基于 event_logs 去重用户（本周）",
    recentFeedback,
    aiHealth,
    canViewAiCharts,
  }
}
