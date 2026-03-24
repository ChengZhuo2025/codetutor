import type {
  AchievementOverview,
  Badge,
  Rank,
  StatItem,
  XpGuideItem,
  XpHistoryItem,
} from "@/features/achievement/types"

export type AchievementSummaryResponseData = {
  currentRank: string
  currentScore: number
  nextRank: string
  nextRankRemainingXP: number
  completedTaskCount: number
  streakDays: number
  overview: AchievementOverview
  ranks: Rank[]
  badges: Badge[]
  stats: StatItem[]
  guideItems: XpGuideItem[]
  calendar: {
    weekDays: string[]
    dates: number[][]
    checkins: boolean[][]
  }
}

export type RecentHistoryResponseData = {
  items: XpHistoryItem[]
  nextCursor: string | null
}
