import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import {
  parseAdminUserListQuery,
  parseAdminUserPatchBody,
  parseAdminUserSoftDeleteBody,
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

export function createAdminUserListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminUserList: (filters: {
    accountStatus: "active" | "deleted" | "all"
    onboardingCompleted?: boolean
    hasActiveLearningPath?: boolean
    keyword?: string
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
      const parsed = parseAdminUserListQuery(url.searchParams)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminUserList(parsed.data)
      return jsonSuccess(data, "用户列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "用户列表读取失败", 500)
    }
  }
}

export function createAdminUserExportGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminUsersExportCsv: (filters: {
    accountStatus: "active" | "deleted" | "all"
    onboardingCompleted?: boolean
    hasActiveLearningPath?: boolean
    keyword?: string
  }) => Promise<{ csv: string; filename: string }>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const url = new URL((request as Request).url)
      const sp = new URLSearchParams(url.searchParams)
      if (!sp.has("limit")) {
        sp.set("limit", "50")
      }
      if (!sp.has("page")) {
        sp.set("page", "1")
      }
      const parsed = parseAdminUserListQuery(sp)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const { accountStatus, onboardingCompleted, hasActiveLearningPath, keyword } = parsed.data

      try {
        const { csv, filename } = await dependencies.getAdminUsersExportCsv({
          accountStatus,
          onboardingCompleted,
          hasActiveLearningPath,
          keyword,
        })
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      } catch (exportError) {
        if (exportError instanceof Error && exportError.message === "USER_EXPORT_LIMIT_EXCEEDED") {
          return jsonError(
            "USER_EXPORT_LIMIT_EXCEEDED",
            `导出行数超过上限，请缩小筛选条件（最多 ${10_000} 行）。`,
            413,
          )
        }
        throw exportError
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "用户导出失败", 500)
    }
  }
}

export function createAdminUserDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminUserDetail: (userId: string) => Promise<unknown | null>
}) {
  return async function GET(request: unknown, routeContext: { params: Promise<{ userId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { userId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "用户 ID 不合法。")

      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      if (!isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "用户 ID 不合法。", 400)
      }

      const data = await dependencies.getAdminUserDetail(routeId.data)

      if (!data) {
        return jsonError("NOT_FOUND", "用户不存在。", 404)
      }

      return jsonSuccess(data, "用户详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "用户详情读取失败", 500)
    }
  }
}

export function createAdminUserPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateAdminUser: (
    adminAccountId: string,
    userId: string,
    patch: import("@/lib/api/contracts/admin-users").AdminUpdateUserRequest,
  ) => Promise<unknown | null>
}) {
  return async function PATCH(request: Request, routeContext: { params: Promise<{ userId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { userId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "用户 ID 不合法。")

      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      if (!isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "用户 ID 不合法。", 400)
      }

      const body = parseAdminUserPatchBody(await request.json())

      if (!body.ok) {
        return jsonError(body.code, body.message, 400)
      }

      const data = await dependencies.updateAdminUser(admin.adminId, routeId.data, body.data)

      if (!data) {
        return jsonError("NOT_FOUND", "用户不存在。", 404)
      }

      return jsonSuccess(data, "用户资料已更新")
    } catch {
      return jsonError("INTERNAL_ERROR", "用户资料更新失败", 500)
    }
  }
}

export function createAdminUserSoftDeletePostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  softDeleteAdminUser: (
    adminAccountId: string,
    userId: string,
    reason: string | null | undefined,
  ) => Promise<unknown | null>
}) {
  return async function POST(request: Request, routeContext: { params: Promise<{ userId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { userId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "用户 ID 不合法。")

      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      if (!isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "用户 ID 不合法。", 400)
      }

      const body = parseAdminUserSoftDeleteBody(await request.json().catch(() => ({})))

      if (!body.ok) {
        return jsonError(body.code, body.message, 400)
      }

      const data = await dependencies.softDeleteAdminUser(
        admin.adminId,
        routeId.data,
        body.data.reason,
      )

      if (!data) {
        return jsonError("NOT_FOUND", "用户不存在。", 404)
      }

      return jsonSuccess(data, "用户已软删除")
    } catch {
      return jsonError("INTERNAL_ERROR", "软删除失败", 500)
    }
  }
}

export function createAdminUserRestorePostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  restoreAdminUser: (
    adminAccountId: string,
    userId: string,
  ) => Promise<import("./service").RestoreAdminUserResult>
}) {
  return async function POST(request: unknown, routeContext: { params: Promise<{ userId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { userId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "用户 ID 不合法。")

      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      if (!isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "用户 ID 不合法。", 400)
      }

      const result = await dependencies.restoreAdminUser(admin.adminId, routeId.data)

      if (result === null) {
        return jsonError("NOT_FOUND", "用户不存在。", 404)
      }

      if (result === "not_soft_deleted") {
        return jsonError("USER_NOT_SOFT_DELETED", "该用户未处于软删除状态，无需恢复。", 409)
      }

      return jsonSuccess(result, "用户已恢复")
    } catch {
      return jsonError("INTERNAL_ERROR", "恢复用户失败", 500)
    }
  }
}
