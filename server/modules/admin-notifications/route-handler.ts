import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import { parseRequiredRouteId } from "@/server/lib/request-validation"

type RequestAdminResult =
  | { ok: true; adminId: string }
  | { ok: false; reason: "missing-config" | "forbidden"; message: string }

type Awaitable<T> = T | Promise<T>

export function createAdminNotificationListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  listAdminNotifications: (filters: {
    status?: "unread" | "read" | "dismissed" | "all"
    category?: "feedback" | "payment" | "ai" | "system" | "user" | "all"
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
      const status = url.searchParams.get("status") ?? "all"
      const category = url.searchParams.get("category") ?? "all"
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)))
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1))

      const data = await dependencies.listAdminNotifications({
        status: status as "unread" | "read" | "dismissed" | "all",
        category: category as "feedback" | "payment" | "ai" | "system" | "user" | "all",
        limit,
        page,
      })
      return jsonSuccess(data, "消息列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "消息列表读取失败", 500)
    }
  }
}

export function createAdminNotificationReadPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  markAdminNotificationRead: (notificationId: string) => Promise<unknown | null>
}) {
  return async function POST(request: Request, routeContext: { params: Promise<{ id: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { id } = await routeContext.params
      const routeId = parseRequiredRouteId(id, "消息 ID 不合法。")
      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      const data = await dependencies.markAdminNotificationRead(routeId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "消息不存在。", 404)
      }

      return jsonSuccess(data, "消息已标记为已读")
    } catch {
      return jsonError("INTERNAL_ERROR", "标记消息已读失败", 500)
    }
  }
}

export function createAdminNotificationDismissPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  dismissAdminNotification: (notificationId: string) => Promise<unknown | null>
}) {
  return async function POST(request: Request, routeContext: { params: Promise<{ id: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { id } = await routeContext.params
      const routeId = parseRequiredRouteId(id, "消息 ID 不合法。")
      if (!routeId.ok) {
        return jsonError(routeId.code, routeId.message, 400)
      }

      const data = await dependencies.dismissAdminNotification(routeId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "消息不存在。", 404)
      }

      return jsonSuccess(data, "消息已忽略")
    } catch {
      return jsonError("INTERNAL_ERROR", "忽略消息失败", 500)
    }
  }
}
