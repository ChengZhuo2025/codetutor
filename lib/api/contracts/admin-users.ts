export const ADMIN_USER_ACCOUNT_STATUSES = ["active", "deleted", "all"] as const
export type AdminUserAccountStatus = (typeof ADMIN_USER_ACCOUNT_STATUSES)[number]

export type AdminUserExportViewRow = {
  userId: string
  nickname: string | null
  avatarUrl: string | null
  wechat: string | null
  oauthWechatLinked: boolean | null
  oauthDouyinLinked: boolean | null
  oauthLinkedProviders: string[] | null
  contactEmail: string | null
  bio: string | null
  signupProvider: string | null
  lastLoginProvider: string | null
  lastLoginAt: string | null
  authPhone: string | null
  authEmail: string | null
  onboardingCompleted: boolean | null
  contentLanguage: string | null
  primaryToolCode: string | null
  primaryToolName: string | null
  activePathStatus: string | null
  activePathSelectionMode: string | null
  activePathLearningLevel: string | null
  activePathCode: string | null
  activePathName: string | null
  activePathStartedAt: string | null
  activePathLastActivityAt: string | null
  activePathTotalSteps: number | null
  activePathCompletedSteps: number | null
  activePathCompletionPercent: number | null
  activePathCompletedTaskCount: number
  activePathInProgressTaskCount: number
  activePathPendingTaskCount: number
  activePathBlockedTaskCount: number
  completedTaskCountTotal: number
  inProgressTaskCountTotal: number
  pendingTaskCountTotal: number
  blockedTaskCountTotal: number
  currentScore: number | null
  currentRankCode: string | null
  streakDays: number | null
  lastLearningAt: string | null
  profileCreatedAt: string | null
  profileUpdatedAt: string | null
  deletedAt: string | null
  deletedReason: string | null
}

export type AdminUserListItem = AdminUserExportViewRow

export type AdminUserListStats = {
  totalUsers: number
  activePlanUsers: number
  streakingUsers: number
  deletedUsers: number
}

export type AdminUserListResponseData = {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
  stats: AdminUserListStats
}

export type AdminUserDetailResponseData = AdminUserExportViewRow

export type AdminUpdateUserRequest = {
  nickname?: string
  bio?: string | null
  contactEmail?: string | null
  wechat?: string | null
  contentLanguage?: string
  onboardingCompleted?: boolean
}

export type AdminSoftDeleteUserRequest = {
  reason?: string | null
}

export type AdminSoftDeleteUserResponseData = AdminUserDetailResponseData

export type AdminRestoreUserResponseData = AdminUserDetailResponseData
