// 管理员认证服务
import { cookies } from "next/headers"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import type { AdminAccountStatus, AdminRoleCode, AdminSessionResponseData } from "@/lib/api/contracts/admin"

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

/**
 * 管理员登录
 */
export async function adminLogin(email: string, password: string): Promise<AdminSessionResponseData> {
  const supabase = createSupabaseAdminClient()

  // 1. 使用 Supabase Auth 验证
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    throw new Error("INVALID_CREDENTIALS")
  }

  // 2. 查询管理员账号
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
    .eq("user_id", authData.user.id)
    .single()

  assertSupabaseSuccess(adminError, "failed to query admin account")

  if (!adminAccount) {
    // 不是管理员，登出并报错
    await supabase.auth.signOut()
    throw new Error("ADMIN_FORBIDDEN")
  }

  const account = adminAccount as unknown as AdminAccountRow

  // 3. 检查账号状态
  if (account.status !== "active") {
    await supabase.auth.signOut()
    throw new Error("ADMIN_INACTIVE_ACCOUNT")
  }

  // 4. 提取角色列表
  const roles: AdminRoleCode[] = (account.admin_account_roles ?? []).map((r) => r.admin_roles.code)

  // 5. 更新最后登录时间
  const { error: updateError } = await supabase
    .from("admin_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", account.id)

  assertSupabaseSuccess(updateError, "failed to update admin last login")

  // 6. 记录审计日志
  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: account.id,
    action: "login",
    target_type: "admin_account",
    target_id: account.id,
    before_snapshot: null,
    after_snapshot: { timestamp: new Date().toISOString() },
    reason: null,
    request_context: { email },
  })

  if (auditError) {
    console.error("Failed to write admin audit log:", auditError)
  }

  return {
    adminAccountId: account.id,
    userId: account.user_id,
    displayName: account.display_name,
    roles,
    status: account.status,
  }
}

/**
 * 获取当前管理员会话
 */
export async function getAdminSession(): Promise<AdminSessionResponseData | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("sb-access-token")?.value

  if (!accessToken) {
    return null
  }

  const supabase = createSupabaseAdminClient()

  // 1. 验证 session
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

  if (authError || !user) {
    return null
  }

  // 2. 查询管理员账号
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
    .eq("user_id", user.id)
    .maybeSingle()

  assertSupabaseSuccess(adminError, "failed to query admin session")

  if (!adminAccount) {
    return null
  }

  const account = adminAccount as unknown as AdminAccountRow

  // 3. 检查账号状态
  if (account.status !== "active") {
    return null
  }

  // 4. 提取角色列表
  const roles: AdminRoleCode[] = (account.admin_account_roles ?? []).map((r) => r.admin_roles.code)

  return {
    adminAccountId: account.id,
    userId: account.user_id,
    displayName: account.display_name,
    roles,
    status: account.status,
  }
}

/**
 * 管理员登出
 */
export async function adminLogout(): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error("LOGOUT_FAILED")
  }
}
