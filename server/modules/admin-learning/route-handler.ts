import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import {
  parseAdminLearningPathListQuery,
  parseAdminLearningSessionListQuery,
  parseAdminLearningPathStatusBody,
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

export function createAdminLearningPathListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathList: (filters: {
    keyword?: string
    status: "all" | "active" | "interrupted" | "completed" | "abandoned"
    toolCode?: string
    learningLevel?: "beginner" | "intermediate" | "advanced"
    updatedWithin: "all" | "7d" | "30d" | "90d"
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
      const parsed = parseAdminLearningPathListQuery(url.searchParams)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminLearningPathList(parsed.data)
      return jsonSuccess(data, "学习计划列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "学习计划列表读取失败", 500)
    }
  }
}

export function createAdminLearningPathExportGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathExportCsv: (filters: {
    keyword?: string
    status: "all" | "active" | "interrupted" | "completed" | "abandoned"
    toolCode?: string
    learningLevel?: "beginner" | "intermediate" | "advanced"
    updatedWithin: "all" | "7d" | "30d" | "90d"
  }) => Promise<{ csv: string; filename: string }>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminLearningPathListQuery(url.searchParams)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      try {
        const { csv, filename } = await dependencies.getAdminLearningPathExportCsv({
          keyword: parsed.data.keyword,
          status: parsed.data.status,
          toolCode: parsed.data.toolCode,
          learningLevel: parsed.data.learningLevel,
          updatedWithin: parsed.data.updatedWithin,
        })

        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      } catch (error) {
        if (error instanceof Error && error.message === "LEARNING_EXPORT_LIMIT_EXCEEDED") {
          return jsonError(
            "LEARNING_EXPORT_LIMIT_EXCEEDED",
            `导出行数超过上限，请缩小筛选条件（最多 ${10_000} 行）。`,
            413,
          )
        }
        throw error
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "学习计划导出失败", 500)
    }
  }
}

export function createAdminLearningPathDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathDetail: (pathId: string) => Promise<unknown | null>
}) {
  return async function GET(request: unknown, routeContext: { params: Promise<{ pathId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { pathId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "学习路径 ID 不合法。")

      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "学习路径 ID 不合法。", 400)
      }

      const data = await dependencies.getAdminLearningPathDetail(routeId.data)

      if (!data) {
        return jsonError("NOT_FOUND", "学习路径不存在。", 404)
      }

      return jsonSuccess(data, "学习路径详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "学习路径详情读取失败", 500)
    }
  }
}

export function createAdminLearningPathStatusPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateAdminLearningPathStatus: (
    adminAccountId: string,
    pathId: string,
    input: {
      action: "reactivate" | "archive"
      reason?: string | null
    },
  ) => Promise<unknown | null>
}) {
  return async function POST(request: Request, routeContext: { params: Promise<{ pathId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { pathId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "学习路径 ID 不合法。")

      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "学习路径 ID 不合法。", 400)
      }

      const body = parseAdminLearningPathStatusBody(await request.json())

      if (!body.ok) {
        return jsonError(body.code, body.message, 400)
      }

      try {
        const data = await dependencies.updateAdminLearningPathStatus(
          admin.adminId,
          routeId.data,
          body.data,
        )

        if (!data) {
          return jsonError("NOT_FOUND", "学习路径不存在。", 404)
        }

        return jsonSuccess(data, "学习路径状态已更新")
      } catch (error) {
        if (error instanceof Error && error.name === "CONFLICT") {
          return jsonError("CONFLICT", error.message, 409)
        }
        if (
          error instanceof Error
          && ["只有", "当前已有进行中的学习计划", "已归档", "不能直接归档"].some((snippet) => error.message.includes(snippet))
        ) {
          return jsonError("VALIDATION_FAILED", error.message, 400)
        }
        throw error
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "学习路径状态更新失败", 500)
    }
  }
}

export function createAdminLearningPathMaterialPlanDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathMaterialPlanDetail: (pathId: string) => Promise<unknown | null>
}) {
  return async function GET(request: unknown, routeContext: { params: Promise<{ pathId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { pathId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "学习路径 ID 不合法。")

      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "学习路径 ID 不合法。", 400)
      }

      const data = await dependencies.getAdminLearningPathMaterialPlanDetail(routeId.data)

      if (!data) {
        return jsonError("NOT_FOUND", "来源草稿不存在。", 404)
      }

      return jsonSuccess(data, "来源草稿详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "来源草稿详情读取失败", 500)
    }
  }
}

export function createAdminLearningPathSessionListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathSessionList: (pathId: string, filters: { page: number; limit: number }) => Promise<unknown | null>
}) {
  return async function GET(request: unknown, routeContext: { params: Promise<{ pathId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { pathId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "学习路径 ID 不合法。")

      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "学习路径 ID 不合法。", 400)
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminLearningSessionListQuery(url.searchParams)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminLearningPathSessionList(routeId.data, parsed.data)
      if (!data) {
        return jsonError("NOT_FOUND", "学习路径不存在。", 404)
      }

      return jsonSuccess(data, "学习路径会话列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "学习路径会话列表读取失败", 500)
    }
  }
}

export function createAdminLearningPathSessionDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningPathSessionDetail: (pathId: string, sessionId: string) => Promise<unknown | null>
}) {
  return async function GET(request: unknown, routeContext: { params: Promise<{ pathId: string; sessionId: string }> }) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { pathId: rawPathId, sessionId: rawSessionId } = await routeContext.params
      const pathId = parseRequiredRouteId(rawPathId, "学习路径 ID 不合法。")
      const sessionId = parseRequiredRouteId(rawSessionId, "会话 ID 不合法。")

      if (!pathId.ok || !isUuid(pathId.data)) {
        return jsonError("BAD_REQUEST", "学习路径 ID 不合法。", 400)
      }

      if (!sessionId.ok || !isUuid(sessionId.data)) {
        return jsonError("BAD_REQUEST", "会话 ID 不合法。", 400)
      }

      const data = await dependencies.getAdminLearningPathSessionDetail(pathId.data, sessionId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "会话不存在。", 404)
      }

      return jsonSuccess(data, "学习路径会话详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "学习路径会话详情读取失败", 500)
    }
  }
}
