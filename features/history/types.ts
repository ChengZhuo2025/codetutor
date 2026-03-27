export type LearningHistoryStatus = "completed" | "in_progress" | "abandoned"

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

export interface FaqItem {
  id: string
  question: string
  answer: string
}
