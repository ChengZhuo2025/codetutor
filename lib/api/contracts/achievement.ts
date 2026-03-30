import type { RankCode } from "@/constants/ranks"
import type {
  AchievementOverview,
} from "@/features/achievement/types"

export type AchievementRankCode = RankCode

export type AchievementBadgeCode =
  | "first_task"
  | "seven_day_streak"
  | "first_debug"
  | "first_project"
  | "multi_tool_master"
  | "monthly_champion"

export type AchievementRankContract = {
  code: AchievementRankCode
  name: string
  minScore: number
  maxScore: number
}

export type AchievementBadgeContract = {
  code: AchievementBadgeCode
  title: string
  desc: string
  earned: boolean
  progressHint?: string
}

export type AchievementHistoryItemContract = {
  label: string
  xp: number
  time: string
  type: "task" | "checkin" | "bonus" | "badge"
}

export type AchievementSummaryResponseData = {
  currentRankCode: AchievementRankCode
  currentRank: string
  currentScore: number
  checkedInToday: boolean
  nextRank: string
  nextRankRemainingXP: number
  completedTaskCount: number
  streakDays: number
  overview: AchievementOverview
  ranks: AchievementRankContract[]
  badges: AchievementBadgeContract[]
  history: AchievementHistoryItemContract[]
  calendar: {
    weekDays: string[]
    dates: number[][]
    checkins: boolean[][]
  }
}
