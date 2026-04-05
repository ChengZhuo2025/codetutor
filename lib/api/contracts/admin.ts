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

// 总览看板响应数据
export type AdminDashboardOverviewResponseData = {
  pendingFeedbackCount: number
  todayNewUserCount: number
  todayCompletedTaskCount: number
  activeLearningPathCount: number
  todayCheckinCount: number
}

// 审计日志操作类型
export const ADMIN_AUDIT_ACTIONS = [
  "login",
  "logout",
  "password_change",
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
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]
