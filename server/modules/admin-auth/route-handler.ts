// 管理员认证路由处理器
import type { NextRequest } from "next/server"

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/constants/auth-cookies"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import type { UpdateAdminLoginEmailResponseData } from "@/lib/api/contracts/auth"
import { buildSessionCookieHeader } from "@/server/lib/session-cookie"
import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import { adminChangePasswordRequestSchema, adminLoginRequestSchema } from "@/server/modules/api-docs/schemas"
import { parseAdminLoginEmailUpdateBody } from "@/server/lib/request-validation"
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

export function appendAdminLogoutCookies(response: Response) {
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

export function createAdminChangePasswordPostHandler(dependencies: {
  getAdminSessionFromRequest: (request: NextRequest) => Promise<AdminSessionResponseData | null>
  adminChangePassword: (input: {
    session: AdminSessionResponseData
    currentPassword: string
    newPassword: string
  }) => Promise<void>
}) {
  return async function POST(request: NextRequest) {
    try {
      const sessionData = await dependencies.getAdminSessionFromRequest(request)

      if (!sessionData) {
        return jsonError("ADMIN_FORBIDDEN", "未登录或会话已过期", 403)
      }

      const body = await (request as RequestLike).json()
      const validationResult = adminChangePasswordRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return jsonError("VALIDATION_FAILED", "请求参数验证失败", 400)
      }

      const { currentPassword, newPassword } = validationResult.data

      await dependencies.adminChangePassword({
        session: sessionData,
        currentPassword,
        newPassword,
      })

      return appendAdminLogoutCookies(
        jsonSuccess({ success: true }, "密码已更新，请使用新密码重新登录"),
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.startsWith("PASSWORD_POLICY:")) {
          return jsonError(
            "VALIDATION_FAILED",
            error.message.slice("PASSWORD_POLICY:".length),
            400,
          )
        }

        switch (error.message) {
          case "INVALID_CURRENT_PASSWORD":
            return jsonError("ADMIN_INVALID_CREDENTIALS", "当前密码不正确", 401)
          case "ADMIN_AUTH_EMAIL_MISSING":
            return jsonError("ADMIN_PASSWORD_CHANGE_UNSUPPORTED", "该账号未绑定邮箱，无法在此修改密码", 400)
        }
      }

      return jsonError("INTERNAL_ERROR", "修改密码失败", 500)
    }
  }
}

export function createAdminLoginEmailPatchHandler(dependencies: {
  getAdminSessionFromRequest: (request: NextRequest) => Promise<AdminSessionResponseData | null>
  updateAdminLoginEmail: (input: {
    session: AdminSessionResponseData
    email: string
  }) => Promise<UpdateAdminLoginEmailResponseData>
}) {
  return async function PATCH(request: NextRequest) {
    try {
      const sessionData = await dependencies.getAdminSessionFromRequest(request)

      if (!sessionData) {
        return jsonError("ADMIN_FORBIDDEN", "未登录或会话已过期", 403)
      }

      const input = parseAdminLoginEmailUpdateBody(await (request as RequestLike).json())

      if (!input.ok) {
        return jsonError(input.code, input.message, input.code === "BAD_REQUEST" ? 400 : 400)
      }

      const data = await dependencies.updateAdminLoginEmail({
        session: sessionData,
        email: input.data.email,
      })

      return appendAdminLogoutCookies(
        jsonSuccess(data, "登录邮箱已更新，请使用新邮箱重新登录"),
      )
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case "ADMIN_LOGIN_EMAIL_UNCHANGED":
            return jsonError("VALIDATION_FAILED", "新登录邮箱不能与当前登录邮箱相同", 400)
          case "ADMIN_AUTH_EMAIL_MISSING":
            return jsonError("ADMIN_LOGIN_EMAIL_UNSUPPORTED", "该账号未绑定邮箱，无法在此修改登录邮箱", 400)
        }
      }

      return jsonError("INTERNAL_ERROR", "修改登录邮箱失败", 500)
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

/**
 * POST /api/admin/auth/change-password
 * 管理员修改登录密码
 */
export async function POST_change_password(request: NextRequest) {
  const service = await import("./service.ts")
  const handler = createAdminChangePasswordPostHandler({
    getAdminSessionFromRequest: service.getAdminSessionFromRequest,
    adminChangePassword: service.adminChangePassword,
  })

  return handler(request)
}

/**
 * PATCH /api/admin/profile/login-email
 * 修改当前管理员登录邮箱
 */
export async function PATCH_login_email(request: NextRequest) {
  const service = await import("./service.ts")
  const handler = createAdminLoginEmailPatchHandler({
    getAdminSessionFromRequest: service.getAdminSessionFromRequest,
    updateAdminLoginEmail: service.updateAdminLoginEmail,
  })

  return handler(request)
}
