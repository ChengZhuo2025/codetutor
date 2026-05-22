import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import { isUuid } from "@/server/lib/identifiers"
import {
  parseAdminLearningTemplateBody,
  parseAdminLearningTemplateGenerateBody,
  parseAdminLearningTemplateListQuery,
  parseRequiredRouteId,
} from "@/server/lib/request-validation"
import type {
  AdminLearningTemplateGenerateRequest,
  AdminLearningTemplateUpsertRequest,
} from "@/lib/api/contracts/admin-learning-templates"

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

function mapRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.name === "CONFLICT") {
    return jsonError("CONFLICT", error.message, 409)
  }
  if (error instanceof Error && error.name === "NOT_FOUND") {
    return jsonError("NOT_FOUND", error.message, 404)
  }
  if (error instanceof Error && error.name === "VALIDATION_FAILED") {
    return jsonError("VALIDATION_FAILED", error.message, 400)
  }
  return jsonError("INTERNAL_ERROR", fallbackMessage, 500)
}

async function requireAdmin(
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>,
  request: unknown,
) {
  const admin = await getRequestAdmin(request)
  if (!admin.ok) {
    return {
      ok: false as const,
      response: jsonError("ADMIN_FORBIDDEN", admin.message, 403),
    }
  }
  return {
    ok: true as const,
    adminId: admin.adminId,
  }
}

export function createAdminLearningTemplateListHandlers(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningTemplateList: (filters: {
    keyword?: string
    status: "all" | "active" | "inactive"
    toolCode?: string
    learningLevel?: "beginner" | "intermediate" | "advanced"
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminLearningTemplate: (adminAccountId: string, input: AdminLearningTemplateUpsertRequest) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }
        const url = new URL((request as Request).url)
        const parsed = parseAdminLearningTemplateListQuery(url.searchParams)
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }
        const data = await dependencies.getAdminLearningTemplateList(parsed.data)
        return jsonSuccess(data, "学习路径模板列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "学习路径模板列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }
        const parsed = parseAdminLearningTemplateBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }
        try {
          const data = await dependencies.createAdminLearningTemplate(admin.adminId, parsed.data)
          return jsonSuccess(data, "学习路径模板创建成功")
        } catch (error) {
          return mapRouteError(error, "学习路径模板创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "学习路径模板创建失败", 500)
      }
    },
  }
}

export function createAdminLearningTemplateDetailHandlers(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminLearningTemplateDetail: (templateId: string) => Promise<unknown | null>
  updateAdminLearningTemplate: (adminAccountId: string, templateId: string, input: AdminLearningTemplateUpsertRequest) => Promise<unknown | null>
}) {
  return {
    async GET(request: unknown, routeContext: { params: Promise<{ templateId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }
        const { templateId: rawId } = await routeContext.params
        const routeId = parseRequiredRouteId(rawId, "模板 ID 不合法。")
        if (!routeId.ok || !isUuid(routeId.data)) {
          return jsonError("BAD_REQUEST", "模板 ID 不合法。", 400)
        }
        const data = await dependencies.getAdminLearningTemplateDetail(routeId.data)
        if (!data) {
          return jsonError("NOT_FOUND", "学习路径模板不存在。", 404)
        }
        return jsonSuccess(data, "学习路径模板详情读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "学习路径模板详情读取失败", 500)
      }
    },
    async PATCH(request: Request, routeContext: { params: Promise<{ templateId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }
        const { templateId: rawId } = await routeContext.params
        const routeId = parseRequiredRouteId(rawId, "模板 ID 不合法。")
        if (!routeId.ok || !isUuid(routeId.data)) {
          return jsonError("BAD_REQUEST", "模板 ID 不合法。", 400)
        }
        const parsed = parseAdminLearningTemplateBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }
        try {
          const data = await dependencies.updateAdminLearningTemplate(admin.adminId, routeId.data, parsed.data)
          if (!data) {
            return jsonError("NOT_FOUND", "学习路径模板不存在。", 404)
          }
          return jsonSuccess(data, "学习路径模板保存成功")
        } catch (error) {
          return mapRouteError(error, "学习路径模板保存失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "学习路径模板保存失败", 500)
      }
    },
  }
}

export function createAdminLearningTemplateGeneratePostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  generateAdminLearningTemplate: (adminAccountId: string, input: AdminLearningTemplateGenerateRequest) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }
      const parsed = parseAdminLearningTemplateGenerateBody(await request.json())
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      try {
        const data = await dependencies.generateAdminLearningTemplate(admin.adminId, parsed.data)
        return jsonSuccess(data, "学习路径模板 AI 生成成功")
      } catch (error) {
        return mapRouteError(error, "学习路径模板 AI 生成失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "学习路径模板 AI 生成失败", 500)
    }
  }
}

export function createAdminLearningTemplateSyncPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  syncUnstartedAdminLearningTemplate: (adminAccountId: string, templateId: string) => Promise<unknown | null>
}) {
  return async function POST(request: Request, routeContext: { params: Promise<{ templateId: string }> }) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }
      const { templateId: rawId } = await routeContext.params
      const routeId = parseRequiredRouteId(rawId, "模板 ID 不合法。")
      if (!routeId.ok || !isUuid(routeId.data)) {
        return jsonError("BAD_REQUEST", "模板 ID 不合法。", 400)
      }
      try {
        const data = await dependencies.syncUnstartedAdminLearningTemplate(admin.adminId, routeId.data)
        if (!data) {
          return jsonError("NOT_FOUND", "学习路径模板不存在。", 404)
        }
        return jsonSuccess(data, "未开始用户路径同步成功")
      } catch (error) {
        return mapRouteError(error, "未开始用户路径同步失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "未开始用户路径同步失败", 500)
    }
  }
}
