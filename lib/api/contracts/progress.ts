import type { MapSummary, ProgressTool, Stage } from "@/features/progress/types"

export type ProgressCurrentResponseData = {
  currentTool: ProgressTool
  currentPathName: string
  currentTaskTitle: string
  currentScore: number
  currentRank: string
  streakDays: number
  checkedInToday: boolean
  summary: MapSummary
}

export type ProgressMapResponseData = {
  pathName: string
  totalSteps: number
  completedSteps: number
  currentStageId: number
  tools: ProgressTool[]
  stages: Stage[]
}
