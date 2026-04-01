// 管理员认证服务
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
} from "@/constants/auth-cookies"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type { AdminAccountStatus, AdminRoleCode, AdminSessionResponseData } from "@/lib/api/contracts/admin"

export type AdminLoginResult = {
  sessionData: AdminSessionResponseData
  accessToken: string
  refreshToken: string | null
}

type AdminAccountRow = {
  id: string
  user_id: string
  display_name: string
  status: AdminAccountStatus
  last_login_at: string | null
  admin_account_roles: Array<{
    admin_roles: {
      code: AdminRoleCode
    }
  }>
}

async function loadAdminAccountByUserId(userId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: adminAccount, error: adminError } = await supabase
    .from("admin_accounts")
    .select(
      `
      id,
      user_id,
      display_name,
      status,
      last_login_at,
      admin_account_roles(
        admin_roles(code)
      )
    `
    )
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(adminError, "failed to query admin account")

  return adminAccount as unknown as AdminAccountRow | null
}

function toAdminSessionData(account: AdminAccountRow): AdminSessionResponseData {
  const roles: AdminRoleCode[] = (account.admin_account_roles ?? []).map((r) => r.admin_roles.code)

  return {
    adminAccountId: account.id,
    userId: account.user_id,
    displayName: account.display_name,
    roles,
    status: account.status,
  }
}

async function writeAdminAuditLog(input: {
  adminAccountId: string
  action: "login" | "logout"
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
    console.error(`Failed to write admin ${input.action} audit log:`, error)
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
  const adminAccount = await loadAdminAccountByUserId(authData.user.id)

  if (!adminAccount) {
    // 不是管理员，登出并报错
    await supabase.auth.signOut()
    throw new Error("ADMIN_FORBIDDEN")
  }

  const account = adminAccount

  // 3. 检查账号状态
  if (account.status !== "active") {
    await supabase.auth.signOut()
    throw new Error("ADMIN_INACTIVE_ACCOUNT")
  }

  await touchAdminLogin(account.id, email)

  return {
    sessionData: toAdminSessionData(account),
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
  const adminAccount = await loadAdminAccountByUserId(userId)

  if (!adminAccount || adminAccount.status !== "active") {
    return null
  }

  return toAdminSessionData(adminAccount)
}

/**
 * 基于 access token 获取管理员会话
 */
export async function getAdminSessionByAccessToken(
  accessToken: string,
): Promise<AdminSessionResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return null
  }

  return getAdminSessionByUserId(user.id)
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
