export type LearningHistoryStatus = "completed" | "in_progress" | "interrupted" | "abandoned"
export type HistoryFilter = "all" | LearningHistoryStatus
export type HistoryPlanAction = "abandon" | "reactivate" | "archive"

export interface LearningHistoryProgress {
  completed: number
  total: number
  percent: number
}

export interface LearningHistory {
  id: string
  planId: string
  title: string
  summary: string
  tool: string
  level: string
  mode: string
  progress: LearningHistoryProgress
  xpEarned: number
  createdAt: string
  updatedAt: string
  status: LearningHistoryStatus
}

export interface LearningHistorySummary {
  activeCount: number
  interruptedCount: number
  completedCount: number
  abandonedCount: number
  totalCount: number
  activePlanId: string | null
  canCreateNewPlan: boolean
}

export interface LearningHistoryDetailStep {
  id: string
  stepNo: number
  title: string
  status: "pending" | "in_progress" | "blocked" | "completed"
  rewardXp: number
  completedAt: string | null
}

export interface LearningHistoryDetail {
  item: LearningHistory
  timeline: {
    startedAt: string
    lastActivityAt: string | null
    completedAt: string | null
    interruptedAt: string | null
    abandonedAt: string | null
  }
  steps: LearningHistoryDetailStep[]
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}
