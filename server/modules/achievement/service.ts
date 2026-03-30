import type {
  AchievementBadgeContract,
  AchievementHistoryItemContract,
  AchievementRankContract,
  AchievementSummaryResponseData,
} from "@/lib/api/contracts/achievement"
import {
  getNextRankDefinition,
  RANK_DEFINITIONS,
} from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type TaskRow = {
  id: string
  user_learning_path_id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
  score_awarded: number
  started_at: string | null
  completed_at: string | null
}

type PathRow = {
  id: string
  path_name_snapshot: string
  tool_id: string
}

type ToolRow = {
  id: string
  code: string
}

const RANKS: AchievementRankContract[] = RANK_DEFINITIONS.map((rank) => ({
  code: rank.code,
  name: rank.name,
  minScore: rank.minScore,
  maxScore: rank.maxScore,
}))

function formatRelativeTime(input: string | null) {
  if (!input) {
    return "刚刚"
  }

  const date = new Date(input)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays <= 0) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
  }

  if (diffDays === 1) {
    return `昨天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
  }

  return `${diffDays} 天前`
}

function getNextRank(currentRankCode: AchievementRankContract["code"]) {
  const nextRank = getNextRankDefinition(currentRankCode)

  return (
    RANKS.find((rank) => rank.code === nextRank.code) ??
    RANKS[0]
  )
}

function buildCalendar(streakDays: number, activeDates: Set<string>) {
  const today = new Date()
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]
  const dates: number[][] = []
  const checkins: boolean[][] = []

  for (let weekOffset = 3; weekOffset >= 0; weekOffset -= 1) {
    const weekDates: number[] = []
    const weekCheckins: boolean[] = []

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const offsetDays = weekOffset * 7 + (6 - dayIndex)
      const current = new Date(today)
      current.setDate(today.getDate() - offsetDays)
      const isoDate = current.toISOString().slice(0, 10)
      const isRecentStreak = offsetDays < streakDays

      weekDates.push(current.getDate())
      weekCheckins.push(activeDates.has(isoDate) || isRecentStreak)
    }

    dates.push(weekDates)
    checkins.push(weekCheckins)
  }

  return { weekDays, dates, checkins }
}

function buildBadges(
  completedTaskCount: number,
  streakDays: number,
  distinctToolCount: number,
  completedTaskTitles: string[],
): AchievementBadgeContract[] {
  return [
    {
      code: "first_task",
      title: "零到一",
      desc: "完成第一个 AI 编程任务",
      earned: completedTaskCount >= 1,
      progressHint: completedTaskCount >= 1 ? "已完成首个任务" : "完成第一个任务后解锁",
    },
    {
      code: "seven_day_streak",
      title: "七日连击",
      desc: "连续学习 7 天",
      earned: streakDays >= 7,
      progressHint: streakDays >= 7 ? "当前连续学习仍在继续" : `当前还差 ${Math.max(0, 7 - streakDays)} 天`,
    },
    {
      code: "first_debug",
      title: "代码驯服师",
      desc: "完成第一次 AI 调试相关任务",
      earned: completedTaskTitles.some((title) => title.includes("调试")),
      progressHint: "完成调试主题关卡后解锁",
    },
    {
      code: "first_project",
      title: "构建者",
      desc: "与 AI 协作完成第一个完整项目",
      earned: completedTaskCount >= 6,
      progressHint: completedTaskCount >= 6 ? "已完成完整路径训练" : "完成更多完整路径任务后解锁",
    },
    {
      code: "multi_tool_master",
      title: "多面手",
      desc: "掌握 3 个以上 AI 编程工具",
      earned: distinctToolCount >= 3,
      progressHint: distinctToolCount >= 3 ? "已覆盖多个工具路径" : "再完成更多工具路径后解锁",
    },
    {
      code: "monthly_champion",
      title: "月度冠军",
      desc: "单月学习表现进入前列",
      earned: false,
      progressHint: "后续接入排行榜后开放",
    },
  ]
}

export async function getAchievementSummaryData(
  userId: string,
): Promise<AchievementSummaryResponseData | null> {
  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, current_rank_code, current_score, streak_days, last_learning_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load achievement profile")

  if (!profile) {
    return null
  }

  const { data: tasks, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, user_learning_path_id, status, score_awarded, started_at, completed_at")
    .eq("user_id", userId)

  assertSupabaseSuccess(taskError, "failed to load achievement tasks")

  const { data: paths, error: pathError } = await supabase
    .from("user_learning_paths")
    .select("id, path_name_snapshot, tool_id")
    .eq("user_id", userId)

  assertSupabaseSuccess(pathError, "failed to load achievement paths")

  const toolIds = Array.from(new Set((paths ?? []).map((path) => path.tool_id)))
  const { data: tools, error: toolError } =
    toolIds.length === 0
      ? { data: [] as ToolRow[], error: null }
      : await supabase
          .from("learning_tools")
          .select("id, code")
          .in("id", toolIds)

  assertSupabaseSuccess(toolError, "failed to load achievement tools")

  const pathById = new Map(((paths ?? []) as PathRow[]).map((path) => [path.id, path]))
  const completedTasks = ((tasks ?? []) as TaskRow[]).filter((task) => task.status === "completed")
  const completedTaskCount = completedTasks.length
  const totalXP = completedTasks.reduce((sum, task) => sum + task.score_awarded, 0)
  const monthlyXP = completedTasks
    .filter((task) => {
      if (!task.completed_at) {
        return false
      }

      const diffDays =
        (Date.now() - new Date(task.completed_at).getTime()) / 86400000

      return diffDays <= 30
    })
    .reduce((sum, task) => sum + task.score_awarded, 0)

  const activeDates = new Set<string>()
  for (const task of completedTasks) {
    if (task.completed_at) {
      activeDates.add(task.completed_at.slice(0, 10))
    }
    if (task.started_at) {
      activeDates.add(task.started_at.slice(0, 10))
    }
  }
  if (profile.last_learning_at) {
    activeDates.add(profile.last_learning_at.slice(0, 10))
  }

  const distinctToolCount = new Set((tools ?? []).map((tool) => tool.code)).size
  const completedTaskTitles = completedTasks.map((task) => {
    const path = pathById.get(task.user_learning_path_id)
    return path?.path_name_snapshot ?? ""
  })
  const badges = buildBadges(
    completedTaskCount,
    profile.streak_days,
    distinctToolCount,
    completedTaskTitles,
  )

  const currentRank =
    RANKS.find((rank) => rank.code === profile.current_rank_code) ?? RANKS[0]
  const nextRank = getNextRank(profile.current_rank_code)
  const history: AchievementHistoryItemContract[] = [
    ...completedTasks
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 6)
      .map((task) => ({
        label: `完成「${pathById.get(task.user_learning_path_id)?.path_name_snapshot ?? "学习任务"}」`,
        xp: task.score_awarded,
        time: formatRelativeTime(task.completed_at),
        type: "task" as const,
      })),
    ...(profile.last_learning_at
      ? [
          {
            label: "最近一次学习打卡",
            xp: 5,
            time: formatRelativeTime(profile.last_learning_at),
            type: "checkin" as const,
          },
        ]
      : []),
    ...badges
      .filter((badge) => badge.earned)
      .slice(0, 2)
      .map((badge) => ({
        label: `获得「${badge.title}」徽章`,
        xp: badge.code === "seven_day_streak" ? 50 : 30,
        time: profile.last_learning_at ? formatRelativeTime(profile.last_learning_at) : "刚刚",
        type: "badge" as const,
      })),
  ].slice(0, 8)

  const calendar = buildCalendar(profile.streak_days, activeDates)

  return {
    currentRankCode: currentRank.code,
    currentRank: currentRank.name,
    currentScore: profile.current_score,
    nextRank: nextRank.name,
    nextRankRemainingXP:
      nextRank.code === currentRank.code
        ? 0
        : Math.max(0, nextRank.minScore - profile.current_score),
    completedTaskCount,
    streakDays: profile.streak_days,
    overview: {
      totalXP: Math.max(profile.current_score, totalXP),
      streakDays: profile.streak_days,
      monthlyXP,
      totalCheckinDays: Math.max(activeDates.size, profile.streak_days),
      nextRankRemainingXP:
        nextRank.code === currentRank.code
          ? 0
          : Math.max(0, nextRank.minScore - profile.current_score),
      earnedBadges: badges.filter((badge) => badge.earned).length,
    },
    ranks: RANKS,
    badges,
    history,
    calendar,
  }
}
