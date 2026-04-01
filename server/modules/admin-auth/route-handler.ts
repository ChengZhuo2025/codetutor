// 管理员认证路由处理器
import type { NextRequest } from "next/server"

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/constants/auth-cookies"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import { buildSessionCookieHeader } from "@/server/lib/session-cookie"
import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import { adminLoginRequestSchema } from "@/server/modules/api-docs/schemas"
import type { AdminLoginResult } from "./service.ts"

function appendAdminSessionCookies(response: Response, result: AdminLoginResult) {
  response.headers.append(
    "Set-Cookie",
    buildSessionCookieHeader(ADMIN_ACCESS_TOKEN_COOKIE, result.accessToken),
  )

  if (result.refreshToken) {
    response.headers.append(
      "Set-Cookie",
      buildSessionCookieHeader(ADMIN_REFRESH_TOKEN_COOKIE, result.refreshToken),
    )
  }

  return response
}

function appendAdminLogoutCookies(response: Response) {
  response.headers.append(
    "Set-Cookie",
    buildSessionCookieHeader(ADMIN_ACCESS_TOKEN_COOKIE, "", 0),
  )
  response.headers.append(
    "Set-Cookie",
    buildSessionCookieHeader(ADMIN_REFRESH_TOKEN_COOKIE, "", 0),
  )

  return response
}

type RequestLike = Pick<NextRequest, "json">

export function createAdminLoginPostHandler(dependencies: {
  getAdminSessionFromRequest: (request: NextRequest) => Promise<AdminSessionResponseData | null>
  adminLogin: (email: string, password: string) => Promise<AdminLoginResult>
}) {
  return async function POST(request: NextRequest) {
    try {
      const existingSession = await dependencies.getAdminSessionFromRequest(request)

      if (existingSession) {
        return jsonSuccess(existingSession, "登录成功")
      }

      const body = await (request as RequestLike).json()
      const validationResult = adminLoginRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return jsonError("VALIDATION_FAILED", "请求参数验证失败", 400)
      }

      const { email, password } = validationResult.data
      const loginResult = await dependencies.adminLogin(email, password)

      return appendAdminSessionCookies(
        jsonSuccess(loginResult.sessionData, "登录成功"),
        loginResult,
      )
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case "INVALID_CREDENTIALS":
            return jsonError("ADMIN_INVALID_CREDENTIALS", "邮箱或密码错误", 401)
          case "ADMIN_FORBIDDEN":
            return jsonError("ADMIN_FORBIDDEN", "无管理员权限", 403)
          case "ADMIN_INACTIVE_ACCOUNT":
            return jsonError("ADMIN_INACTIVE_ACCOUNT", "管理员账号已停用", 403)
        }
      }

      return jsonError("INTERNAL_ERROR", "登录失败", 500)
    }
  }
}

export function createAdminSessionGetHandler(dependencies: {
  getAdminSessionFromRequest: (request: NextRequest) => Promise<AdminSessionResponseData | null>
}) {
  return async function GET(request: NextRequest) {
    try {
      const sessionData = await dependencies.getAdminSessionFromRequest(request)

      if (!sessionData) {
        return jsonError("ADMIN_FORBIDDEN", "未登录或会话已过期", 403)
      }

      return jsonSuccess(sessionData, "获取会话成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "获取会话失败", 500)
    }
  }
}

export function createAdminLogoutPostHandler(dependencies: {
  getAdminSessionFromRequest: (request: NextRequest) => Promise<AdminSessionResponseData | null>
  adminLogout: (session: AdminSessionResponseData) => Promise<void>
}) {
  return async function POST(request: NextRequest) {
    try {
      const sessionData = await dependencies.getAdminSessionFromRequest(request)

      if (sessionData) {
        await dependencies.adminLogout(sessionData)
      }

      return appendAdminLogoutCookies(jsonSuccess({ success: true }, "登出成功"))
    } catch {
      return jsonError("INTERNAL_ERROR", "登出失败", 500)
    }
  }
}

/**
 * POST /api/admin/auth/login
 * 管理员登录
 */
export async function POST_login(request: NextRequest) {
  const service = await import("./service.ts")
  const loginHandler = createAdminLoginPostHandler({
    getAdminSessionFromRequest: service.getAdminSessionFromRequest,
    adminLogin: service.adminLogin,
  })

  return loginHandler(request)
}

/**
 * GET /api/admin/auth/session
 * 获取当前管理员会话
 */
export async function GET_session(request: NextRequest) {
  const service = await import("./service.ts")
  const sessionHandler = createAdminSessionGetHandler({
    getAdminSessionFromRequest: service.getAdminSessionFromRequest,
  })

  return sessionHandler(request)
}

/**
 * POST /api/admin/auth/logout
 * 管理员登出
 */
export async function POST_logout(request: NextRequest) {
  const service = await import("./service.ts")
  const logoutHandler = createAdminLogoutPostHandler({
    getAdminSessionFromRequest: service.getAdminSessionFromRequest,
    adminLogout: service.adminLogout,
  })

  return logoutHandler(request)
}
