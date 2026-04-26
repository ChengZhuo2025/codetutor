import { readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  AdminAccountStatus,
  AdminAuditAction,
  AdminRoleCode,
} from "@/lib/api/contracts/admin"
import type {
  AdminSettingsAdminAccountListItem,
  AdminSettingsAdminAccountListResponseData,
  AdminSettingsAuditLogListItem,
  AdminSettingsAuditLogListResponseData,
  AdminSettingsOverviewResponseData,
  AdminSettingsRoleDefinition,
  AdminSiteContactResponseData,
  AdminUpdateAdminAccountStatusRequest,
  AdminUpdateAdminAccountStatusResponseData,
  ContactChannelConfig,
  UpdateSiteContactRequest,
} from "@/lib/api/contracts/admin-settings"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { isUuid } from "@/server/lib/identifiers"
import {
  QR_CODE_BUCKET,
  QR_CODE_MAX_BYTES,
  QR_CODE_ALLOWED_TYPES,
} from "@/lib/supabase/storage"

type AdminAccountWithRolesRow = {
  id: string
  user_id: string
  display_name: string
  status: AdminAccountStatus
  last_login_at: string | null
  created_at: string
  admin_account_roles: Array<{
    admin_roles: {
      code: AdminRoleCode
    } | null
  }>
}

type AdminRoleRow = {
  id: string
  code: AdminRoleCode
  name: string
  description: string | null
}

type AdminAccountRoleRow = {
  admin_account_id: string
  admin_role_id: string
}

type UserProfileAvatarRow = {
  user_id: string
  avatar_url: string | null
}

type AdminAuditLogRow = {
  id: string
  action: AdminAuditAction
  target_type: "admin_account" | "user_profile" | "user_learning_path" | "site_contact" | "payment_settings"
  target_id: string | null
  reason: string | null
  created_at: string
  admin_accounts:
    | {
        id: string
        display_name: string
      }
    | null
}

type PackageMeta = {
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const PACKAGE_JSON = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as PackageMeta

const APP_NAME = "AI编程学习教练管理后台"
const ADMIN_AUTH_MODE = "Supabase Auth + admin_accounts"
const INFRA_DATABASE = "Supabase PostgreSQL"
const INFRA_STORAGE = "Supabase Storage"
const INFRA_AUTH = "Supabase Auth"

function getPackageVersion(name: string) {
  return PACKAGE_JSON.dependencies?.[name]
    ?? PACKAGE_JSON.devDependencies?.[name]
    ?? null
}

function escapeIlikeFragment(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function normalizeRoles(row: AdminAccountWithRolesRow): AdminRoleCode[] {
  return (row.admin_account_roles ?? [])
    .map((item) => item.admin_roles?.code)
    .filter((value): value is AdminRoleCode => Boolean(value))
}

async function loadAdminAccountsWithRoles(status?: "all" | "active" | "inactive" | "suspended") {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("admin_accounts")
    .select(`
      id,
      user_id,
      display_name,
      status,
      last_login_at,
      created_at,
      admin_account_roles(
        admin_roles(
          code
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  assertSupabaseSuccess(error, "failed to query admin accounts with roles")
  return (data ?? []) as unknown as AdminAccountWithRolesRow[]
}

async function loadUserAvatarMap(userIds: string[]) {
  const normalized = Array.from(new Set(userIds.filter(Boolean)))
  if (normalized.length === 0) {
    return new Map<string, string | null>()
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_url")
    .in("user_id", normalized)

  assertSupabaseSuccess(error, "failed to query admin profile avatars")

  return new Map(
    ((data ?? []) as UserProfileAvatarRow[]).map((row) => [row.user_id, row.avatar_url ?? null]),
  )
}

async function loadUserEmailMap(userIds: string[]) {
  const supabase = createSupabaseAdminClient()
  const uniqueIds = new Set(userIds.filter(Boolean))

  // Batch-fetch all auth users via listUsers, handling pagination
  const emailMap = new Map<string, string | null>()
  let page = 1
  const perPage = 1000 // Supabase max per page

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error("Failed to list auth users for email map:", error)
      break
    }

    for (const user of data.users) {
      if (uniqueIds.has(user.id)) {
        emailMap.set(user.id, user.email ?? null)
      }
    }

    // Stop if we've fetched all users or found all requested ids
    if (data.users.length < perPage || emailMap.size >= uniqueIds.size) break
    page++
  }

  // Fill missing ids with null
  for (const id of uniqueIds) {
    if (!emailMap.has(id)) {
      emailMap.set(id, null)
    }
  }

  return emailMap
}

function buildAdminAccountStats(items: AdminSettingsAdminAccountListItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.totalAdminAccounts += 1
      if (item.status === "active") {
        acc.activeAdminAccounts += 1
      } else if (item.status === "inactive") {
        acc.inactiveAdminAccounts += 1
      } else if (item.status === "suspended") {
        acc.suspendedAdminAccounts += 1
      }
      return acc
    },
    {
      totalAdminAccounts: 0,
      activeAdminAccounts: 0,
      inactiveAdminAccounts: 0,
      suspendedAdminAccounts: 0,
    },
  )
}

async function buildAdminAccountItems(status?: "all" | "active" | "inactive" | "suspended") {
  const rows = await loadAdminAccountsWithRoles(status)
  const userIds = rows.map((row) => row.user_id)
  const [avatarMap, emailMap] = await Promise.all([
    loadUserAvatarMap(userIds),
    loadUserEmailMap(userIds),
  ])

  const items: AdminSettingsAdminAccountListItem[] = rows.map((row) => ({
    adminAccountId: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: avatarMap.get(row.user_id) ?? null,
    email: emailMap.get(row.user_id) ?? null,
    roles: normalizeRoles(row),
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }))

  return items
}

async function loadRoleDefinitions(): Promise<AdminSettingsRoleDefinition[]> {
  const supabase = createSupabaseAdminClient()
  const [{ data: roles, error: rolesError }, { data: accountRoles, error: accountRolesError }] =
    await Promise.all([
      supabase.from("admin_roles").select("id, code, name, description").order("created_at", {
        ascending: true,
      }),
      supabase.from("admin_account_roles").select("admin_account_id, admin_role_id"),
    ])

  assertSupabaseSuccess(rolesError, "failed to query admin roles")
  assertSupabaseSuccess(accountRolesError, "failed to query admin account role relations")

  const counts = new Map<string, number>()
  for (const row of (accountRoles ?? []) as AdminAccountRoleRow[]) {
    counts.set(row.admin_role_id, (counts.get(row.admin_role_id) ?? 0) + 1)
  }

  return ((roles ?? []) as AdminRoleRow[]).map((role) => ({
    code: role.code,
    name: role.name,
    description: role.description,
    accountCount: counts.get(role.id) ?? 0,
  }))
}

async function loadAuditLogCountLast7Days() {
  const supabase = createSupabaseAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since)

  assertSupabaseSuccess(error, "failed to count recent admin audit logs")
  return count ?? 0
}

async function loadAdminAccountById(adminAccountId: string) {
  const rows = await loadAdminAccountsWithRoles()
  return rows.find((row) => row.id === adminAccountId) ?? null
}

async function writeAdminAccountAudit(input: {
  adminAccountId: string
  action: Extract<AdminAuditAction, "admin_account_activate" | "admin_account_deactivate">
  targetAdminAccountId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  reason?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: "admin_account",
    target_id: input.targetAdminAccountId,
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    reason: input.reason ?? null,
    request_context: null,
  })

  if (error) {
    throw new Error(`AUDIT_LOG_WRITE_FAILED:failed to write admin account audit log: ${error.message}`)
  }
}

export async function getAdminSettingsOverview(
  adminAccountId: string,
): Promise<AdminSettingsOverviewResponseData> {
  const [items, roleDefinitions, auditLogCountLast7Days] = await Promise.all([
    buildAdminAccountItems(),
    loadRoleDefinitions(),
    loadAuditLogCountLast7Days(),
  ])

  const currentAdmin = items.find((item) => item.adminAccountId === adminAccountId)
  if (!currentAdmin) {
    throw new Error("ADMIN_NOT_FOUND")
  }

  const stats = buildAdminAccountStats(items)

  return {
    currentAdmin: {
      ...currentAdmin,
      lastLoginAt: currentAdmin.lastLoginAt,
    },
    stats: {
      ...stats,
      auditLogCountLast7Days,
    },
    roleDefinitions,
    systemInfo: {
      appName: APP_NAME,
      appVersion: PACKAGE_JSON.version ?? "0.1.0",
      environment: process.env.NODE_ENV ?? "development",
      nextVersion: getPackageVersion("next"),
      reactVersion: getPackageVersion("react"),
      adminAuthMode: ADMIN_AUTH_MODE,
      database: INFRA_DATABASE,
      storage: INFRA_STORAGE,
      auth: INFRA_AUTH,
    },
  }
}

export async function getAdminSettingsAdminAccountList(filters: {
  keyword?: string
  status: "all" | "active" | "inactive" | "suspended"
  limit: number
  page: number
}): Promise<AdminSettingsAdminAccountListResponseData> {
  const items = await buildAdminAccountItems(filters.status)
  const stats = buildAdminAccountStats(items)
  const normalizedKeyword = filters.keyword?.trim().toLowerCase() ?? ""

  const filtered = items.filter((item) => {
    if (!normalizedKeyword) {
      return true
    }
    return [
      item.displayName,
      item.email ?? "",
      item.userId,
      item.roles.join(","),
    ].some((value) => value.toLowerCase().includes(normalizedKeyword))
  })

  const page = filters.page > 0 ? filters.page : 1
  const from = (page - 1) * filters.limit
  const to = from + filters.limit

  return {
    items: filtered.slice(from, to),
    total: filtered.length,
    page,
    limit: filters.limit,
    stats,
  }
}

export async function updateAdminSettingsAdminAccountStatus(
  adminAccountId: string,
  targetAdminAccountId: string,
  input: AdminUpdateAdminAccountStatusRequest,
): Promise<AdminUpdateAdminAccountStatusResponseData | null> {
  if (!isUuid(adminAccountId) || !isUuid(targetAdminAccountId)) {
    return null
  }

  const [actor, target] = await Promise.all([
    loadAdminAccountById(adminAccountId),
    loadAdminAccountById(targetAdminAccountId),
  ])

  if (!actor) {
    const error = new Error("当前管理员不存在。")
    error.name = "FORBIDDEN"
    throw error
  }

  if (!target) {
    return null
  }

  if (!normalizeRoles(actor).includes("super_admin")) {
    const error = new Error("仅超级管理员可以修改管理员账号状态。")
    error.name = "FORBIDDEN"
    throw error
  }

  if (adminAccountId === targetAdminAccountId) {
    const error = new Error("不能停用当前登录账号。")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const nextStatus: AdminAccountStatus =
    input.action === "activate" ? "active" : "inactive"

  if (target.status === nextStatus) {
    return {
      adminAccountId: target.id,
      status: target.status,
    }
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("admin_accounts")
    .update({ status: nextStatus })
    .eq("id", target.id)

  assertSupabaseSuccess(error, "failed to update admin account status")

  try {
    await writeAdminAccountAudit({
      adminAccountId,
      action: input.action === "activate" ? "admin_account_activate" : "admin_account_deactivate",
      targetAdminAccountId: target.id,
      beforeSnapshot: {
        status: target.status,
      },
      afterSnapshot: {
        status: nextStatus,
      },
      reason: input.reason ?? null,
    })
  } catch (auditError) {
    throw auditError
  }

  return {
    adminAccountId: target.id,
    status: nextStatus,
  }
}

export async function getAdminSettingsAuditLogList(filters: {
  keyword?: string
  action: string
  targetType: "all" | "admin_account" | "user_profile" | "user_learning_path" | "site_contact" | "payment_settings"
  limit: number
  page: number
}): Promise<AdminSettingsAuditLogListResponseData> {
  const supabase = createSupabaseAdminClient()
  const page = filters.page > 0 ? filters.page : 1
  const from = (page - 1) * filters.limit
  const to = from + filters.limit - 1
  const keyword = filters.keyword?.trim()

  let countQuery = supabase.from("admin_audit_logs").select("*", { count: "exact", head: true })
  let listQuery = supabase
    .from("admin_audit_logs")
    .select(`
      id,
      action,
      target_type,
      target_id,
      reason,
      created_at,
      admin_accounts:admin_user_id(
        id,
        display_name
      )
    `)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.action !== "all") {
    countQuery = countQuery.eq("action", filters.action)
    listQuery = listQuery.eq("action", filters.action)
  }

  if (filters.targetType !== "all") {
    countQuery = countQuery.eq("target_type", filters.targetType)
    listQuery = listQuery.eq("target_type", filters.targetType)
  }

  if (keyword) {
    const pattern = `%${escapeIlikeFragment(keyword)}%`
    countQuery = countQuery.or(`action.ilike.${pattern},reason.ilike.${pattern},target_type.ilike.${pattern}`)
    listQuery = listQuery.or(`action.ilike.${pattern},reason.ilike.${pattern},target_type.ilike.${pattern}`)
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    listQuery,
  ])

  assertSupabaseSuccess(countError, "failed to count admin audit logs")
  assertSupabaseSuccess(error, "failed to query admin audit logs")

  const items: AdminSettingsAuditLogListItem[] = ((data ?? []) as unknown as AdminAuditLogRow[]).map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    actorAdminAccountId: row.admin_accounts?.id ?? "",
    actorDisplayName: row.admin_accounts?.display_name ?? "未知管理员",
    reason: row.reason,
    createdAt: row.created_at,
  }))

  return {
    items,
    total: count ?? 0,
    page,
    limit: filters.limit,
  }
}

// =============================================
// Site Contact Settings (for enterprise contact management)
// =============================================

function computeMaskedHandle(handle: string): string {
  if (!handle) return ""
  const h = handle.trim()
  if (h.length <= 6) return h
  // Common masking: first 3 + **** + last 4 (for phones) or appropriate for IDs
  return h.slice(0, 3) + "****" + h.slice(-4)
}

function mapSiteContactRowToResponse(row: Record<string, unknown>): AdminSiteContactResponseData {
  const rawChannels = (row.contact_channels as unknown[]) || []

  const channels: ContactChannelConfig[] = rawChannels.map((ch) => {
    const channel = ch as ContactChannelConfig
    return {
      ...channel,
      maskedHandle: channel.maskedHandle || computeMaskedHandle(channel.handle || ""),
      // qrImageUrl takes precedence; qrSeed is legacy
    }
  })

  return {
    companyName: row.company_name as string,
    address: row.address as string,
    website: row.website as string,
    contactEmail: row.contact_email as string,
    serviceHours: row.service_hours as string,
    contactChannels: channels,
    updatedAt: row.updated_at as string | null,
    updatedByAdminId: row.updated_by_admin_id as string | null,
  }
}

export async function loadSiteContactSettings(): Promise<AdminSiteContactResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_contact_settings")
    .select("*")
    .eq("id", 1)
    .single()

  assertSupabaseSuccess(error, "failed to load site contact settings")

  if (!data) {
    throw new Error("SITE_CONTACT_SETTINGS_NOT_FOUND")
  }

  return mapSiteContactRowToResponse(data)
}

async function writeSiteContactAudit(input: {
  adminAccountId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: "site_contact_update" as AdminAuditAction,
    target_type: "site_contact",
    target_id: "1",
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    reason: null,
    request_context: null,
  })

  if (error) {
    console.error("Failed to write site contact audit log:", error)
    // Non-blocking for audit
  }
}

export async function uploadQrCodeImage(
  adminAccountId: string,
  file: File,
): Promise<{ qrImageUrl: string; storagePath: string }> {
  if (!isUuid(adminAccountId)) {
    throw new Error("管理员ID无效")
  }

  if (!QR_CODE_ALLOWED_TYPES.includes(file.type as (typeof QR_CODE_ALLOWED_TYPES)[number])) {
    throw new Error("二维码仅支持 JPG、PNG、WebP、GIF 格式")
  }

  if (file.size > QR_CODE_MAX_BYTES) {
    throw new Error("二维码图片不能超过 2MB")
  }

  const bytes = await file.arrayBuffer()
  const supabase = createSupabaseAdminClient()
  const extension = file.name.split(".").pop() || "png"
  const timestamp = Date.now()
  const objectPath = `qr-${timestamp}-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(QR_CODE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    })

  assertSupabaseSuccess(uploadError, "failed to upload qr code image")

  const {
    data: { publicUrl },
  } = supabase.storage.from(QR_CODE_BUCKET).getPublicUrl(objectPath)

  return {
    qrImageUrl: publicUrl,
    storagePath: objectPath,
  }
}

export async function updateSiteContactSettings(
  adminAccountId: string,
  input: UpdateSiteContactRequest,
): Promise<AdminSiteContactResponseData> {
  if (!isUuid(adminAccountId)) {
    const error = new Error("管理员ID无效")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const supabase = createSupabaseAdminClient()

  // Load current state for audit snapshot
  const before = await loadSiteContactSettings()

  const updatePayload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }

  if (input.companyName !== undefined) updatePayload.company_name = input.companyName
  if (input.address !== undefined) updatePayload.address = input.address
  if (input.website !== undefined) updatePayload.website = input.website
  if (input.contactEmail !== undefined) updatePayload.contact_email = input.contactEmail
  if (input.serviceHours !== undefined) updatePayload.service_hours = input.serviceHours
  if (input.contactChannels !== undefined) {
    // Ensure maskedHandle is computed before saving
    updatePayload.contact_channels = (input.contactChannels as ContactChannelConfig[]).map((ch) => ({
      ...ch,
      maskedHandle: ch.maskedHandle || computeMaskedHandle(ch.handle || ""),
    }))
  }

  const { data, error } = await supabase
    .from("site_contact_settings")
    .update(updatePayload)
    .eq("id", 1)
    .select("*")
    .single()

  assertSupabaseSuccess(error, "failed to update site contact settings")

  const after = mapSiteContactRowToResponse(data!)

  // Record audit (non-blocking)
  try {
    await writeSiteContactAudit({
      adminAccountId,
      beforeSnapshot: before,
      afterSnapshot: after,
    })
  } catch (auditError) {
    console.error("Audit write failed for site contact update:", auditError)
  }

  return after
}
