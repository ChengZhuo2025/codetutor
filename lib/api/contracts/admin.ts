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

// 总览看板响应数据
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
  /** 近 24h 按小时成功率；无 AI 权限时为 null */
  aiHourlySuccess: AdminDashboardHourlyPoint[] | null
  /** 本周按日去重活跃用户数（event_logs）；无数据则为 0 */
  weeklyActiveByDay: AdminDashboardDayActivePoint[] | null
  weeklyActiveSubtitle: string
  recentFeedback: AdminDashboardFeedbackRow[]
  aiHealth: AdminDashboardAiHealthItem[] | null
  canViewAiCharts: boolean
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
  "payment_settings_update",
  "alipay_payment_settings_update",
  "subscription_plan_create",
  "subscription_plan_update",
  "subscription_plan_archive",
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]
