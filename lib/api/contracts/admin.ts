// 管理员状态
export const ADMIN_ACCOUNT_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const

export type AdminAccountStatus = (typeof ADMIN_ACCOUNT_STATUSES)[number]

// 管理员角色代码
export const ADMIN_ROLE_CODES = [
  "super_admin",
  "support_admin",
  "ops_admin",
  "ai_ops_admin",
] as const

export type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number]

// 管理员登录请求
export type AdminLoginRequest = {
  email: string
  password: string
}

// 管理员会话响应数据
export type AdminSessionResponseData = {
  adminAccountId: string
  userId: string
  displayName: string
  avatarUrl: string | null
  roles: AdminRoleCode[]
  status: AdminAccountStatus
}

// 总览看板 — 指标趋势
export type AdminDashboardTrend = "up" | "down" | "neutral"

/** 单指标：value 为展示用数值；comparisonLabel 为较昨日文案，null 表示暂无对比 */
export type AdminDashboardMetric = {
  value: number
  trend: AdminDashboardTrend
  comparisonLabel: string | null
}

export type AdminDashboardHourlyPoint = {
  time: string
  successRate: number
}

export type AdminDashboardDayActivePoint = {
  day: string
  activeUsers: number
}

export type AdminDashboardFeedbackRow = {
  id: string
  userLabel: string
  typeLabel: string
  statusLabel: string
  priority: "low" | "medium" | "high"
  relativeTime: string
}

export type AdminDashboardAiHealthItem = {
  modelCode: string
  providerCode: string
  message: string
  severity: "warning" | "info"
  relativeTime: string
}

export type AdminDashboardOverviewResponseData = {
  generatedAt: string
  pendingFeedbackCount: number
  todayNewUserCount: number
  todayCompletedTaskCount: number
  activeLearningPathCount: number
  todayCheckinCount: number
  todayOnboardingCompletedCount: number
  metrics: {
    todayNewUsers: AdminDashboardMetric
    todayOnboardingCompleted: AdminDashboardMetric
    activeLearningPaths: AdminDashboardMetric
    todayCompletedTasks: AdminDashboardMetric
    todayCheckinUsers: AdminDashboardMetric
    pendingFeedback: AdminDashboardMetric
    aiSuccessRate24h: AdminDashboardMetric | null
    aiAvgLatencyMs24h: AdminDashboardMetric | null
  }
  aiHourlySuccess: AdminDashboardHourlyPoint[] | null
  weeklyActiveByDay: AdminDashboardDayActivePoint[] | null
  weeklyActiveSubtitle: string
  recentFeedback: AdminDashboardFeedbackRow[]
  aiHealth: AdminDashboardAiHealthItem[] | null
  canViewAiCharts: boolean
}

export const ADMIN_NOTIFICATION_SEVERITIES = ["info", "warning", "critical"] as const
export type AdminNotificationSeverity = (typeof ADMIN_NOTIFICATION_SEVERITIES)[number]

export const ADMIN_NOTIFICATION_STATUSES = ["unread", "read", "dismissed"] as const
export type AdminNotificationStatus = (typeof ADMIN_NOTIFICATION_STATUSES)[number]

export const ADMIN_NOTIFICATION_CATEGORIES = [
  "feedback",
  "payment",
  "ai",
  "system",
  "user",
] as const
export type AdminNotificationCategory = (typeof ADMIN_NOTIFICATION_CATEGORIES)[number]

export type AdminNotificationListItem = {
  id: string
  severity: AdminNotificationSeverity
  category: AdminNotificationCategory
  title: string
  content: string
  status: AdminNotificationStatus
  targetUrl: string | null
  sourceType: string
  sourceId: string | null
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
  readAt: string | null
  dismissedAt: string | null
}

export type AdminNotificationListResponseData = {
  items: AdminNotificationListItem[]
  total: number
  unreadCount: number
}

export type AdminNotificationMutationResponseData = {
  id: string
  status: AdminNotificationStatus
  readAt: string | null
  dismissedAt: string | null
}

export type AdminCreateNotificationRequest = {
  severity?: AdminNotificationSeverity
  category: AdminNotificationCategory
  title: string
  content: string
  targetUrl?: string | null
  sourceType: string
  sourceId?: string | null
  payload?: Record<string, unknown>
}

// 审计日志操作类型
export const ADMIN_AUDIT_ACTIONS = [
  "login",
  "logout",
  "password_change",
  "login_email_change",
  "admin_account_activate",
  "admin_account_deactivate",
  "feedback_reply",
  "feedback_status_update",
  "user_note_create",
  "score_adjustment",
  "user_profile_update",
  "user_soft_delete",
  "user_restore",
  "learning_path_status_update",
  "learning_template_create",
  "learning_template_update",
  "learning_template_ai_generate",
  "learning_template_sync_unstarted",
  "ai_provider_create",
  "ai_provider_update",
  "ai_model_create",
  "ai_model_update",
  "ai_agent_create",
  "ai_agent_update",
  "ai_agent_binding_create",
  "ai_agent_binding_update",
  "ai_agent_skill_binding_create",
  "ai_agent_skill_binding_update",
  "ai_media_transcription_setting_update",
  "ai_test_run",
  "site_contact_update",
  "site_information_update",
  "site_article_update",
  "site_help_category_create",
  "site_help_category_update",
  "site_help_item_create",
  "site_help_item_update",
  "site_logo_upload",
  "site_changelog_generate",
  "site_changelog_update",
  "site_changelog_publish",
  "site_changelog_archive",
  "site_changelog_delete",
  "payment_settings_update",
  "alipay_payment_settings_update",
  "subscription_plan_create",
  "subscription_plan_update",
  "subscription_plan_archive",
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]
