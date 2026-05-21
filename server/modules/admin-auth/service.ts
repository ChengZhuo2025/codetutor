// 管理员认证服务
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { performance } from "node:perf_hooks"

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
} from "@/constants/auth-cookies"
import { createSupabaseAnonServerClient } from "@/lib/supabase/anon-server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { markAuthCacheStatus, recordServerTiming } from "@/server/lib/observability"
import { hashSensitiveValue } from "@/server/lib/request-fingerprint"
import { createRuntimeCache } from "@/server/lib/runtime-cache"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type { AdminAccountStatus, AdminRoleCode, AdminSessionResponseData } from "@/lib/api/contracts/admin"
import type { UpdateAdminLoginEmailResponseData } from "@/lib/api/contracts/auth"

export type AdminLoginResult = {
  sessionData: AdminSessionResponseData
  accessToken: string
  refreshToken: string | null
}

type AdminSessionLookupRow = {
  admin_account_id: string
  user_id: string
  display_name: string
  status: AdminAccountStatus
  avatar_url: string | null
  roles: AdminRoleCode[] | null
}

const ADMIN_SESSION_CACHE_TTL_MS = 60_000

const adminSessionCache = createRuntimeCache<AdminSessionResponseData | null>({
  name: "admin-session",
  ttlMs: ADMIN_SESSION_CACHE_TTL_MS,
  maxEntries: 500,
})

function normalizeRoleCodes(roles: unknown): AdminRoleCode[] {
  if (!Array.isArray(roles)) {
    return []
  }

  return roles.filter((role): role is AdminRoleCode => typeof role === "string")
}

function toAdminSessionDataFromLookup(row: AdminSessionLookupRow): AdminSessionResponseData {
  return {
    adminAccountId: row.admin_account_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    roles: normalizeRoleCodes(row.roles),
    status: row.status,
  }
}

async function loadAdminSessionByUserId(userId: string): Promise<AdminSessionResponseData | null> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .rpc("get_admin_session_lookup", {
      p_user_id: userId,
    })
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin session lookup")

  if (!data) {
    return null
  }

  return toAdminSessionDataFromLookup(data as unknown as AdminSessionLookupRow)
}

async function writeAdminAuditLog(input: {
  adminAccountId: string
  action: "login" | "logout" | "password_change" | "login_email_change"
  requestContext: Record<string, unknown>
}) {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: "admin_account",
    target_id: input.adminAccountId,
    before_snapshot: null,
    after_snapshot: { timestamp: new Date().toISOString() },
    reason: null,
    request_context: input.requestContext,
  })

  if (error) {
    throw new Error(`AUDIT_LOG_WRITE_FAILED:failed to write admin ${input.action} audit log: ${error.message}`)
  }
}

export async function touchAdminLogin(adminAccountId: string, email: string) {
  const supabase = createSupabaseAdminClient()

  const { error: updateError } = await supabase
    .from("admin_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", adminAccountId)

  assertSupabaseSuccess(updateError, "failed to update admin last login")

  await writeAdminAuditLog({
    adminAccountId,
    action: "login",
    requestContext: { email },
  })
}

/**
 * 管理员登录
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  const supabase = createSupabaseAdminClient()

  // 1. 使用 Supabase Auth 验证
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    throw new Error("INVALID_CREDENTIALS")
  }

  if (!authData.session?.access_token) {
    throw new Error("INVALID_CREDENTIALS")
  }

  // 2. 查询管理员账号
  const sessionData = await loadAdminSessionByUserId(authData.user.id)

  if (!sessionData) {
    // 不是管理员，登出并报错
    await supabase.auth.signOut()
    throw new Error("ADMIN_FORBIDDEN")
  }

  // 3. 检查账号状态
  if (sessionData.status !== "active") {
    await supabase.auth.signOut()
    throw new Error("ADMIN_INACTIVE_ACCOUNT")
  }

  await touchAdminLogin(sessionData.adminAccountId, email)
  preloadAdminSessionCache(authData.session.access_token, sessionData)

  return {
    sessionData,
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  }
}

/**
 * 获取当前管理员会话
 */
export async function getAdminSession(): Promise<AdminSessionResponseData | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value

  if (!accessToken) {
    return null
  }

  return getAdminSessionByAccessToken(accessToken)
}

/**
 * 基于 userId 获取管理员会话
 */
export async function getAdminSessionByUserId(userId: string): Promise<AdminSessionResponseData | null> {
  const sessionData = await loadAdminSessionByUserId(userId)

  if (!sessionData || sessionData.status !== "active") {
    return null
  }

  return sessionData
}

export function preloadAdminSessionCache(
  accessToken: string | null | undefined,
  sessionData: AdminSessionResponseData,
) {
  const normalized = accessToken?.trim()

  if (!normalized) {
    return
  }

  adminSessionCache.set(hashSensitiveValue(normalized), sessionData)
}

/**
 * 基于 access token 获取管理员会话
 */
export async function getAdminSessionByAccessToken(
  accessToken: string,
): Promise<AdminSessionResponseData | null> {
  const tokenHash = hashSensitiveValue(accessToken)
  const startedAt = performance.now()
  const cached = await adminSessionCache.getOrLoadDetailed(tokenHash, async () => {
    const supabase = createSupabaseAdminClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return null
    }

    return getAdminSessionByUserId(user.id)
  })

  markAuthCacheStatus(cached.status)
  recordServerTiming("admin_auth_session_lookup", performance.now() - startedAt)
  return cached.value
}

/**
 * 基于请求获取管理员会话
 */
export async function getAdminSessionFromRequest(
  request: NextRequest,
): Promise<AdminSessionResponseData | null> {
  const accessToken = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value

  if (!accessToken) {
    return null
  }

  return getAdminSessionByAccessToken(accessToken)
}

export function clearAdminSessionCaches(input: {
  accessToken?: string | null
  refreshToken?: string | null
}) {
  if (input.accessToken?.trim()) {
    adminSessionCache.delete(hashSensitiveValue(input.accessToken.trim()))
  }

  if (input.refreshToken?.trim()) {
    adminSessionCache.delete(hashSensitiveValue(input.refreshToken.trim()))
  }
}

function validateAdminNewPassword(password: string): string | null {
  if (password.length < 8) {
    return "新密码至少需要 8 位字符。"
  }

  if (!/[a-zA-Z]/.test(password)) {
    return "新密码需包含至少一个英文字母。"
  }

  if (!/[0-9]/.test(password)) {
    return "新密码需包含至少一个数字。"
  }

  return null
}

/**
 * 修改当前管理员登录账号的密码（需验证原密码）。
 */
export async function adminChangePassword(input: {
  session: AdminSessionResponseData
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const policyError = validateAdminNewPassword(input.newPassword)

  if (policyError) {
    throw new Error(`PASSWORD_POLICY:${policyError}`)
  }

  if (input.currentPassword === input.newPassword) {
    throw new Error("PASSWORD_POLICY:新密码不能与当前密码相同。")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
    input.session.userId,
  )

  assertSupabaseSuccess(getUserError, "failed to get auth user for password change")

  const email = userData.user?.email?.trim()

  if (!email) {
    throw new Error("ADMIN_AUTH_EMAIL_MISSING")
  }

  const anon = createSupabaseAnonServerClient()
  const { error: signInError } = await anon.auth.signInWithPassword({
    email,
    password: input.currentPassword,
  })

  if (signInError) {
    throw new Error("INVALID_CURRENT_PASSWORD")
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(input.session.userId, {
    password: input.newPassword,
  })

  assertSupabaseSuccess(updateError, "failed to update admin password")

  await writeAdminAuditLog({
    adminAccountId: input.session.adminAccountId,
    action: "password_change",
    requestContext: { userId: input.session.userId },
  })
}

export async function updateAdminLoginEmail(input: {
  session: AdminSessionResponseData
  email: string
}): Promise<UpdateAdminLoginEmailResponseData> {
  const email = input.email.trim().toLowerCase()
  const supabaseAdmin = createSupabaseAdminClient()
  const { data: beforeData, error: beforeError } = await supabaseAdmin.auth.admin.getUserById(
    input.session.userId,
  )

  assertSupabaseSuccess(beforeError, "failed to get auth user for login email change")

  const beforeEmail = beforeData.user?.email?.trim().toLowerCase() ?? null

  if (beforeEmail === email) {
    throw new Error("ADMIN_LOGIN_EMAIL_UNCHANGED")
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(input.session.userId, {
    email,
    email_confirm: true,
  })

  assertSupabaseSuccess(error, "failed to update admin login email")

  const updatedEmail = data.user?.email?.trim()

  if (!updatedEmail) {
    throw new Error("ADMIN_AUTH_EMAIL_MISSING")
  }

  await writeAdminAuditLog({
    adminAccountId: input.session.adminAccountId,
    action: "login_email_change",
    requestContext: {
      userId: input.session.userId,
      beforeEmail,
      afterEmail: updatedEmail,
    },
  })

  return {
    userId: input.session.userId,
    email: updatedEmail,
  }
}

/**
 * 管理员登出
 */
export async function adminLogout(session: AdminSessionResponseData): Promise<void> {
  await writeAdminAuditLog({
    adminAccountId: session.adminAccountId,
    action: "logout",
    requestContext: { userId: session.userId },
  })
}
