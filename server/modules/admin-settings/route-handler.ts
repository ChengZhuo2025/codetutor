import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import {
  parseAdminSettingsAccountListQuery,
  parseAdminSettingsAccountStatusBody,
  parseAdminSettingsAuditListQuery,
  parseRequiredRouteId,
} from "@/server/lib/request-validation"
import { isUuid } from "@/server/lib/identifiers"

type RequestAdminResult =
  | {
      ok: true
      adminId: string
    }
  | {
      ok: false
      reason: "missing-config" | "forbidden"
      message: string
    }

type Awaitable<T> = T | Promise<T>

export function createAdminSettingsOverviewGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminSettingsOverview: (adminAccountId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const data = await dependencies.getAdminSettingsOverview(admin.adminId)
      return jsonSuccess(data, "系统设置概览读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "系统设置概览读取失败", 500)
    }
  }
}

export function createAdminSettingsAccountListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminSettingsAdminAccountList: (filters: {
    keyword?: string
    status: "all" | "active" | "inactive" | "suspended"
    limit: number
    page: number
  }) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminSettingsAccountListQuery(url.searchParams)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminSettingsAdminAccountList(parsed.data)
      return jsonSuccess(data, "管理员账号列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "管理员账号列表读取失败", 500)
    }
  }
}

export function createAdminSettingsAccountStatusPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateAdminSettingsAdminAccountStatus: (
    adminAccountId: string,
    targetAdminAccountId: string,
    input: {
      action: "activate" | "deactivate"
      reason?: string | null
    },
  ) => Promise<unknown | null>
}) {
  return async function POST(
    request: Request,
    routeContext: { params: Promise<{ adminAccountId: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { adminAccountId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "管理员账号 ID 不合法。")

      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "管理员账号 ID 不合法。", 400)
      }

      const body = parseAdminSettingsAccountStatusBody(await request.json())

      if (!body.ok) {
        return jsonError(body.code, body.message, 400)
      }

      try {
        const data = await dependencies.updateAdminSettingsAdminAccountStatus(
          admin.adminId,
          routeId.data,
          body.data,
        )

        if (!data) {
          return jsonError("NOT_FOUND", "管理员账号不存在。", 404)
        }

        return jsonSuccess(data, "管理员账号状态已更新")
      } catch (error) {
        if (error instanceof Error && error.name === "FORBIDDEN") {
          return jsonError("ADMIN_FORBIDDEN", error.message, 403)
        }
        if (error instanceof Error && error.name === "CONFLICT") {
          return jsonError("CONFLICT", error.message, 409)
        }
        if (error instanceof Error && error.name === "VALIDATION_FAILED") {
          return jsonError("VALIDATION_FAILED", error.message, 400)
        }
        throw error
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "管理员账号状态更新失败", 500)
    }
  }
}

export function createAdminSettingsAuditLogListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminSettingsAuditLogList: (filters: {
    keyword?: string
    action: string
    targetType: "all" | "admin_account" | "user_profile" | "user_learning_path"
    limit: number
    page: number
  }) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminSettingsAuditListQuery(url.searchParams)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminSettingsAuditLogList(parsed.data)
      return jsonSuccess(data, "操作审计列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "操作审计列表读取失败", 500)
    }
  }
}
