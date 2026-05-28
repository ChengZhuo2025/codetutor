import type {
  AdminAccountStatus,
  AdminAuditAction,
  AdminRoleCode,
} from "@/lib/api/contracts/admin"

export const ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES = [
  "all",
  "active",
  "inactive",
  "suspended",
] as const

export type AdminSettingsAccountListStatus =
  (typeof ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES)[number]

export const ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS = [
  "activate",
  "deactivate",
] as const

export type AdminSettingsAccountStatusAction =
  (typeof ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS)[number]

export const ADMIN_SETTINGS_AUDIT_TARGET_TYPES = [
  "all",
  "admin_account",
  "user_profile",
  "user_learning_path",
  "site_contact",
  "site_information",
  "site_article",
  "site_help_category",
  "site_help_item",
  "payment_settings",
  "subscription_plan",
] as const

export type AdminSettingsAuditTargetType =
  (typeof ADMIN_SETTINGS_AUDIT_TARGET_TYPES)[number]

export type AdminSettingsOverviewCurrentAdmin = {
  adminAccountId: string
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  loginEmail: string | null
  contactEmail: string | null
  status: AdminAccountStatus
  roles: AdminRoleCode[]
  lastLoginAt: string | null
}

export type AdminSettingsStats = {
  totalAdminAccounts: number
  activeAdminAccounts: number
  inactiveAdminAccounts: number
  suspendedAdminAccounts: number
}

export type AdminSettingsRoleDefinition = {
  code: AdminRoleCode
  name: string
  description: string | null
  accountCount: number
}

export type AdminSettingsSystemInfo = {
  appName: string
  appVersion: string
  environment: string
  nextVersion: string | null
  reactVersion: string | null
  adminAuthMode: string
  database: string
  storage: string
  auth: string
}

export type AdminSettingsOverviewResponseData = {
  currentAdmin: AdminSettingsOverviewCurrentAdmin
  stats: AdminSettingsStats & {
    auditLogCountLast7Days: number
  }
  roleDefinitions: AdminSettingsRoleDefinition[]
  systemInfo: AdminSettingsSystemInfo
}

export type AdminSettingsAdminAccountListItem = {
  adminAccountId: string
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  loginEmail: string | null
  contactEmail: string | null
  roles: AdminRoleCode[]
  status: AdminAccountStatus
  lastLoginAt: string | null
  createdAt: string
}

export type AdminSettingsAdminAccountListResponseData = {
  items: AdminSettingsAdminAccountListItem[]
  total: number
  page: number
  limit: number
  stats: AdminSettingsStats
}

export type AdminUpdateAdminAccountStatusRequest = {
  action: AdminSettingsAccountStatusAction
  reason?: string | null
}

export type AdminUpdateAdminAccountStatusResponseData = {
  adminAccountId: string
  status: AdminAccountStatus
}

export type AdminSettingsAuditLogListItem = {
  id: string
  action: AdminAuditAction
  targetType: Exclude<AdminSettingsAuditTargetType, "all">
  targetId: string | null
  actorAdminAccountId: string
  actorDisplayName: string
  reason: string | null
  createdAt: string
}

export type AdminSettingsAuditLogListResponseData = {
  items: AdminSettingsAuditLogListItem[]
  total: number
  page: number
  limit: number
}

export type ContactChannelConfig = {
  title: string
  handle: string
  maskedHandle?: string // computed by backend/frontend from handle
  summary: string
  qrLabel: string
  qrImageUrl?: string | null // real uploaded QR image URL (preferred over seed)
  qrSeed?: number // legacy fallback for generated QR
  type: "wechat" | "douyin"
}

export type SiteContactSettings = {
  companyName: string
  address: string
  website: string
  contactEmail: string
  serviceHours: string
  contactChannels: ContactChannelConfig[]
  updatedAt: string | null
  updatedByAdminId?: string | null
}

export type AdminSiteContactResponseData = SiteContactSettings

export type UpdateSiteContactRequest = {
  companyName?: string
  address?: string
  website?: string
  contactEmail?: string
  serviceHours?: string
  contactChannels?: ContactChannelConfig[]
}
