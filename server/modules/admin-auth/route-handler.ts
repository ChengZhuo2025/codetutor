// 管理员认证路由处理器
import type { NextRequest } from "next/server"

import { ok, fail } from "@/server/lib/api-response"
import { adminLoginRequestSchema } from "@/server/modules/api-docs/schemas"
import { adminLogin, getAdminSession, adminLogout } from "./service"
import type { AdminLoginRequest } from "@/lib/api/contracts/admin"

/**
 * POST /api/admin/auth/login
 * 管理员登录
 */
export async function POST_login(req: NextRequest) {
  try {
    const body = await req.json()

    // 验证请求体
    const validationResult = adminLoginRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return fail("VALIDATION_FAILED", "请求参数验证失败", 400)
    }

    const { email, password } = validationResult.data as AdminLoginRequest

    // 执行登录
    const sessionData = await adminLogin(email, password)

    return ok(sessionData, "登录成功")
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_CREDENTIALS":
          return fail("ADMIN_INVALID_CREDENTIALS", "邮箱或密码错误", 401)
        case "ADMIN_FORBIDDEN":
          return fail("ADMIN_FORBIDDEN", "无管理员权限", 403)
        case "ADMIN_INACTIVE_ACCOUNT":
          return fail("ADMIN_INACTIVE_ACCOUNT", "管理员账号已停用", 403)
      }
    }
    return fail("INTERNAL_ERROR", "登录失败", 500)
  }
}

/**
 * GET /api/admin/auth/session
 * 获取当前管理员会话
 */
export async function GET_session() {
  try {
    const sessionData = await getAdminSession()

    if (!sessionData) {
      return fail("ADMIN_FORBIDDEN", "未登录或会话已过期", 403)
    }

    return ok(sessionData, "获取会话成功")
  } catch {
    return fail("INTERNAL_ERROR", "获取会话失败", 500)
  }
}

/**
 * POST /api/admin/auth/logout
 * 管理员登出
 */
export async function POST_logout(req: NextRequest) {
  try {
    await adminLogout()
    return ok({ success: true }, "登出成功")
  } catch {
    return fail("INTERNAL_ERROR", "登出失败", 500)
  }
}
