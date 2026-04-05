// 管理员看板路由处理器
import { jsonError, jsonSuccess } from "@/server/lib/route-response"

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

export function createAdminDashboardOverviewGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getDashboardOverview: (adminAccountId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const data = await dependencies.getDashboardOverview(admin.adminId)
      return jsonSuccess(data, "获取看板数据成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "获取看板数据失败", 500)
    }
  }
}
