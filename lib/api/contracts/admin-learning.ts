export const ADMIN_LEARNING_PATH_STATUSES = [
  "active",
  "interrupted",
  "completed",
  "abandoned",
  "archived",
] as const

export const ADMIN_LEARNING_PATH_LIST_STATUSES = [
  "all",
  "active",
  "interrupted",
  "completed",
  "abandoned",
] as const

export const ADMIN_LEARNING_UPDATED_WITHIN_OPTIONS = [
  "all",
  "7d",
  "30d",
  "90d",
] as const

export const ADMIN_LEARNING_PATH_STATUS_ACTIONS = [
  "reactivate",
  "archive",
] as const

export type AdminLearningPathStatus = (typeof ADMIN_LEARNING_PATH_STATUSES)[number]
export type AdminLearningPathListStatus = (typeof ADMIN_LEARNING_PATH_LIST_STATUSES)[number]
export type AdminLearningUpdatedWithin = (typeof ADMIN_LEARNING_UPDATED_WITHIN_OPTIONS)[number]
export type AdminLearningPathStatusAction = (typeof ADMIN_LEARNING_PATH_STATUS_ACTIONS)[number]

export type AdminLearningToolOption = {
  code: string
  name: string
}

export type AdminLearningPathListItem = {
  pathId: string
  userId: string
  userNickname: string | null
  userAvatarUrl: string | null
  userEmail: string | null
  toolCode: string
  toolName: string
  pathCode: string
  pathName: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  learningLevelLabel: string
  selectionMode: "self_directed" | "preset_training"
  selectionModeLabel: string
  status: Exclude<AdminLearningPathStatus, "archived">
  progressPercent: number
  completedTaskCount: number
  inProgressTaskCount: number
  blockedTaskCount: number
  totalTaskCount: number
  xpEarned: number
  startedAt: string
  lastLearningAt: string | null
  updatedAt: string
}

export type AdminLearningPathListStats = {
  totalPaths: number
  activeCount: number
  interruptedCount: number
  completedCount: number
  abandonedCount: number
}

export type AdminLearningPathListResponseData = {
  items: AdminLearningPathListItem[]
  total: number
  page: number
  limit: number
  stats: AdminLearningPathListStats
  toolOptions?: AdminLearningToolOption[]
}

export type AdminLearningPathTimeline = {
  startedAt: string
  lastActivityAt: string | null
  completedAt: string | null
  interruptedAt: string | null
  abandonedAt: string | null
  archivedAt: string | null
}

export type AdminLearningPathDetailStep = {
  stepId: string
  stepNo: number
  title: string
  status: "pending" | "in_progress" | "blocked" | "completed"
  rewardXp: number
  completedAt: string | null
}

export type AdminLearningPathRecentSession = {
  sessionId: string
  status: string
  startedAt: string
  lastMessageAt: string | null
  messageCount: number
  latestAssistantSummary: string | null
}

export type AdminLearningPathDetailResponseData = {
  pathId: string
  user: {
    userId: string
    nickname: string | null
    avatarUrl: string | null
    email: string | null
    currentScore: number
    currentRankLabel: string
    streakDays: number
    lastLearningAt: string | null
  }
  path: {
    pathCode: string
    pathName: string
    summary: string | null
    toolCode: string
    toolName: string
    learningLevel: "beginner" | "intermediate" | "advanced"
    learningLevelLabel: string
    selectionMode: "self_directed" | "preset_training"
    selectionModeLabel: string
    status: AdminLearningPathStatus
    totalSteps: number
    completedSteps: number
    progressPercent: number
    totalTaskCount: number
    completedTaskCount: number
    inProgressTaskCount: number
    blockedTaskCount: number
    pendingTaskCount: number
    xpEarned: number
  }
  timeline: AdminLearningPathTimeline
  steps: AdminLearningPathDetailStep[]
  recentSessions: AdminLearningPathRecentSession[]
}

export type AdminUpdateLearningPathStatusRequest = {
  action: AdminLearningPathStatusAction
  reason?: string | null
}

export type AdminUpdateLearningPathStatusResponseData = {
  pathId: string
  status: AdminLearningPathStatus
}
