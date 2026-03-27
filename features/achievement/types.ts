import type { LucideIcon } from "lucide-react"
import type { IconifyIcon } from "@iconify/types"

export type AchievementIcon = IconifyIcon

export type Rank = {
  name: string
  min: number
  max: number
  color: string
  bg: string
  icon: AchievementIcon
}

export type Badge = {
  id: number
  title: string
  desc: string
  icon: AchievementIcon
  earned: boolean
  color: string
  progressHint?: string
}

export type StatItem = {
  label: string
  value: string
  unit: string
  icon: LucideIcon
  color: string
  hint: string
}

export type XpGuideItem = {
  label: string
  xp: string
  color: string
  desc: string
}

export type XpHistoryItem = {
  label: string
  xp: string
  time: string
  type: "task" | "checkin" | "bonus" | "badge"
}

export type AchievementOverview = {
  totalXP: number
  streakDays: number
  monthlyXP: number
  totalCheckinDays: number
  nextRankRemainingXP: number
  earnedBadges: number
}
