export type StageStatus = "done" | "current" | "locked"

export type StagePitfall = {
  text: string
  isTrap?: boolean
}

export type Stage = {
  id: number
  taskId: string
  reviewSessionId?: string | null
  title: string
  summary: string
  goal: string
  completionCriteria: string
  reviewSummary: string
  xp: number
  status: StageStatus
  tags: string[]
  keyPoints: string[]
  pitfalls: StagePitfall[]
  estimatedTime: string
  focus: string
  unlockHint?: string
}

export type ProgressTool = {
  id: string
  label: string
}

export type MapSummary = {
  totalXP: number
  currentRank: string
  nextRank: string
  remainingXPToNextRank: number
  streakDays: number
}
