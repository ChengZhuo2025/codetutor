import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import type {
  AdminAIAgentBindingUpsertRequest,
  AdminAIAgentSkillBindingUpsertRequest,
  AdminAIAgentUpsertRequest,
  AdminAIModelUpsertRequest,
  AdminAIProviderSecretRevealResponseData,
  AdminAIProviderUpsertRequest,
  AdminAIResolvePreviewRequest,
  AdminAITestRequest,
} from "@/lib/api/contracts/admin-ai"
import {
  parseAdminAIAgentBody,
  parseAdminAIAgentBindingBody,
  parseAdminAIAgentListQuery,
  parseAdminAIAgentSkillBindingBody,
  parseAdminAIInvocationListQuery,
  parseAdminAIModelBody,
  parseAdminAIProviderBody,
  parseAdminAIResolvePreviewBody,
  parseAdminAITestBody,
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

function parseUuidRoute(rawId: string, label: string) {
  const routeId = parseRequiredRouteId(rawId, `${label} 不合法。`)
  if (!routeId.ok || !isUuid(routeId.data)) {
    return jsonError("BAD_REQUEST", `${label} 不合法。`, 400)
  }

  return routeId.data
}

function mapCommonRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.name === "FORBIDDEN") {
    return jsonError("ADMIN_FORBIDDEN", error.message, 403)
  }
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

export function createAdminAIOverviewGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIOverview: (adminAccountId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const data = await dependencies.getAdminAIOverview(admin.adminId)
      return jsonSuccess(data, "AI 运营概览读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "AI 运营概览读取失败", 500)
    }
  }
}

export function createAdminAIProviderListHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIProviderList: (filters: {
    adminAccountId: string
    keyword?: string
    status: "all" | "active" | "inactive"
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminAIProvider: (adminAccountId: string, input: AdminAIProviderUpsertRequest) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const url = new URL((request as Request).url)
        const parsed = parseAdminAIAgentListQuery(url.searchParams, { allowScenario: false })
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        const data = await dependencies.getAdminAIProviderList({
          adminAccountId: admin.adminId,
          keyword: parsed.data.keyword,
          status: parsed.data.status ?? "all",
          page: parsed.data.page,
          limit: parsed.data.limit,
        })
        return jsonSuccess(data, "Provider 列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Provider 列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const parsed = parseAdminAIProviderBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.createAdminAIProvider(admin.adminId, parsed.data)
          return jsonSuccess(data, "Provider 创建成功")
        } catch (error) {
          return mapCommonRouteError(error, "Provider 创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Provider 创建失败", 500)
      }
    },
  }
}

export function createAdminAIProviderDetailHandlers(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIProviderDetail: (adminAccountId: string, providerId: string) => Promise<unknown | null>
  updateAdminAIProvider: (
    adminAccountId: string,
    providerId: string,
    input: AdminAIProviderUpsertRequest,
  ) => Promise<unknown | null>
}) {
  return {
    async GET(request: unknown, routeContext: { params: Promise<{ providerId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { providerId: rawId } = await routeContext.params
        const providerId = parseRequiredRouteId(rawId, "Provider ID 不合法。")
        if (!providerId.ok) {
          return jsonError(providerId.code, providerId.message, 400)
        }

        const data = await dependencies.getAdminAIProviderDetail(admin.adminId, providerId.data)
        if (!data) {
          return jsonError("NOT_FOUND", "Provider 不存在。", 404)
        }

        return jsonSuccess(data, "Provider 详情读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Provider 详情读取失败", 500)
      }
    },
    async PATCH(request: Request, routeContext: { params: Promise<{ providerId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { providerId: rawId } = await routeContext.params
        const providerId = parseRequiredRouteId(rawId, "Provider ID 不合法。")
        if (!providerId.ok) {
          return jsonError(providerId.code, providerId.message, 400)
        }

        const parsed = parseAdminAIProviderBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.updateAdminAIProvider(admin.adminId, providerId.data, parsed.data)
          if (!data) {
            return jsonError("NOT_FOUND", "Provider 不存在。", 404)
          }
          return jsonSuccess(data, "Provider 已更新")
        } catch (error) {
          return mapCommonRouteError(error, "Provider 更新失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Provider 更新失败", 500)
      }
    },
  }
}

export function createAdminAIProviderSecretRevealPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  revealAdminAIProviderSecret: (
    adminAccountId: string,
    providerId: string,
  ) => Promise<AdminAIProviderSecretRevealResponseData | null>
}) {
  return async function POST(
    request: Request,
    routeContext: { params: Promise<{ providerId: string }> },
  ) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const { providerId: rawId } = await routeContext.params
      const providerId = parseRequiredRouteId(rawId, "Provider ID 不合法。")
      if (!providerId.ok) {
        return jsonError(providerId.code, providerId.message, 400)
      }

      try {
        const data = await dependencies.revealAdminAIProviderSecret(admin.adminId, providerId.data)
        if (!data) {
          return jsonError("NOT_FOUND", "Provider 不存在。", 404)
        }
        return jsonSuccess(data, "Provider 密钥读取成功")
      } catch (error) {
        return mapCommonRouteError(error, "Provider 密钥读取失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "Provider 密钥读取失败", 500)
    }
  }
}

export function createAdminAIModelListHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIModelList: (filters: {
    adminAccountId: string
    keyword?: string
    status: "all" | "active" | "inactive"
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminAIModel: (adminAccountId: string, input: AdminAIModelUpsertRequest) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const url = new URL((request as Request).url)
        const parsed = parseAdminAIAgentListQuery(url.searchParams, { allowScenario: false })
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        const data = await dependencies.getAdminAIModelList({
          adminAccountId: admin.adminId,
          keyword: parsed.data.keyword,
          status: parsed.data.status ?? "all",
          page: parsed.data.page,
          limit: parsed.data.limit,
        })
        return jsonSuccess(data, "Model 列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Model 列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const parsed = parseAdminAIModelBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.createAdminAIModel(admin.adminId, parsed.data)
          return jsonSuccess(data, "Model 创建成功")
        } catch (error) {
          return mapCommonRouteError(error, "Model 创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Model 创建失败", 500)
      }
    },
  }
}

export function createAdminAIModelDetailHandlers(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIModelDetail: (adminAccountId: string, modelId: string) => Promise<unknown | null>
  updateAdminAIModel: (
    adminAccountId: string,
    modelId: string,
    input: AdminAIModelUpsertRequest,
  ) => Promise<unknown | null>
}) {
  return {
    async GET(request: unknown, routeContext: { params: Promise<{ modelId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { modelId: rawId } = await routeContext.params
        const parsedId = parseRequiredRouteId(rawId, "Model ID 不合法。")
        if (!parsedId.ok) {
          return jsonError(parsedId.code, parsedId.message, 400)
        }

        const data = await dependencies.getAdminAIModelDetail(admin.adminId, parsedId.data)
        if (!data) {
          return jsonError("NOT_FOUND", "Model 不存在。", 404)
        }

        return jsonSuccess(data, "Model 详情读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Model 详情读取失败", 500)
      }
    },
    async PATCH(request: Request, routeContext: { params: Promise<{ modelId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { modelId: rawId } = await routeContext.params
        const parsedId = parseRequiredRouteId(rawId, "Model ID 不合法。")
        if (!parsedId.ok) {
          return jsonError(parsedId.code, parsedId.message, 400)
        }

        const parsed = parseAdminAIModelBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.updateAdminAIModel(admin.adminId, parsedId.data, parsed.data)
          if (!data) {
            return jsonError("NOT_FOUND", "Model 不存在。", 404)
          }
          return jsonSuccess(data, "Model 已更新")
        } catch (error) {
          return mapCommonRouteError(error, "Model 更新失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Model 更新失败", 500)
      }
    },
  }
}

export function createAdminAIAgentListHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIAgentList: (filters: {
    adminAccountId: string
    keyword?: string
    scenarioType?: "teaching" | "blocked_help" | "task_review" | "completion_feedback" | "path_guidance"
    status: "all" | "active" | "inactive"
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminAIAgent: (adminAccountId: string, input: AdminAIAgentUpsertRequest) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const url = new URL((request as Request).url)
        const parsed = parseAdminAIAgentListQuery(url.searchParams)
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        const data = await dependencies.getAdminAIAgentList({
          adminAccountId: admin.adminId,
          keyword: parsed.data.keyword,
          scenarioType: parsed.data.scenarioType,
          status: parsed.data.status ?? "all",
          page: parsed.data.page,
          limit: parsed.data.limit,
        })
        return jsonSuccess(data, "Agent 列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const parsed = parseAdminAIAgentBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.createAdminAIAgent(admin.adminId, parsed.data)
          return jsonSuccess(data, "Agent 创建成功")
        } catch (error) {
          return mapCommonRouteError(error, "Agent 创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 创建失败", 500)
      }
    },
  }
}

export function createAdminAIAgentDetailHandlers(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIAgentDetail: (adminAccountId: string, agentId: string) => Promise<unknown | null>
  updateAdminAIAgent: (
    adminAccountId: string,
    agentId: string,
    input: AdminAIAgentUpsertRequest,
  ) => Promise<unknown | null>
}) {
  return {
    async GET(request: unknown, routeContext: { params: Promise<{ agentId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { agentId: rawId } = await routeContext.params
        const agentId = parseUuidRoute(rawId, "Agent ID")
        if (typeof agentId !== "string") {
          return agentId
        }

        const data = await dependencies.getAdminAIAgentDetail(admin.adminId, agentId)
        if (!data) {
          return jsonError("NOT_FOUND", "Agent 不存在。", 404)
        }

        return jsonSuccess(data, "Agent 详情读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 详情读取失败", 500)
      }
    },
    async PATCH(request: Request, routeContext: { params: Promise<{ agentId: string }> }) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const { agentId: rawId } = await routeContext.params
        const agentId = parseUuidRoute(rawId, "Agent ID")
        if (typeof agentId !== "string") {
          return agentId
        }

        const parsed = parseAdminAIAgentBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.updateAdminAIAgent(admin.adminId, agentId, parsed.data)
          if (!data) {
            return jsonError("NOT_FOUND", "Agent 不存在。", 404)
          }
          return jsonSuccess(data, "Agent 已更新")
        } catch (error) {
          return mapCommonRouteError(error, "Agent 更新失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 更新失败", 500)
      }
    },
  }
}

export function createAdminAIAgentBindingListHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIAgentBindingList: (filters: {
    adminAccountId: string
    keyword?: string
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminAIAgentBinding: (
    adminAccountId: string,
    input: AdminAIAgentBindingUpsertRequest,
  ) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const url = new URL((request as Request).url)
        const parsed = parseAdminAIAgentListQuery(url.searchParams, { allowScenario: false, allowStatus: false })
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        const data = await dependencies.getAdminAIAgentBindingList({
          adminAccountId: admin.adminId,
          ...parsed.data,
        })
        return jsonSuccess(data, "Agent 命中规则列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 命中规则列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const parsed = parseAdminAIAgentBindingBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.createAdminAIAgentBinding(admin.adminId, parsed.data)
          return jsonSuccess(data, "Agent 命中规则创建成功")
        } catch (error) {
          return mapCommonRouteError(error, "Agent 命中规则创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent 命中规则创建失败", 500)
      }
    },
  }
}

export function createAdminAIAgentBindingDetailPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateAdminAIAgentBinding: (
    adminAccountId: string,
    bindingId: string,
    input: AdminAIAgentBindingUpsertRequest,
  ) => Promise<unknown | null>
}) {
  return async function PATCH(
    request: Request,
    routeContext: { params: Promise<{ bindingId: string }> },
  ) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const { bindingId: rawId } = await routeContext.params
      const bindingId = parseUuidRoute(rawId, "命中规则 ID")
      if (typeof bindingId !== "string") {
        return bindingId
      }

      const parsed = parseAdminAIAgentBindingBody(await request.json())
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      try {
        const data = await dependencies.updateAdminAIAgentBinding(admin.adminId, bindingId, parsed.data)
        if (!data) {
          return jsonError("NOT_FOUND", "命中规则不存在。", 404)
        }
        return jsonSuccess(data, "命中规则已更新")
      } catch (error) {
        return mapCommonRouteError(error, "命中规则更新失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "命中规则更新失败", 500)
    }
  }
}

export function createAdminAISkillListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAISkillList: (filters: {
    adminAccountId: string
    keyword?: string
    page: number
    limit: number
  }) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminAIAgentListQuery(url.searchParams, { allowScenario: false, allowStatus: false })
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminAISkillList({
        adminAccountId: admin.adminId,
        ...parsed.data,
      })
      return jsonSuccess(data, "Skill 列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "Skill 列表读取失败", 500)
    }
  }
}

export function createAdminAIAgentSkillBindingListHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIAgentSkillBindingList: (filters: {
    adminAccountId: string
    keyword?: string
    page: number
    limit: number
  }) => Promise<unknown>
  createAdminAIAgentSkillBinding: (
    adminAccountId: string,
    input: AdminAIAgentSkillBindingUpsertRequest,
  ) => Promise<unknown>
}) {
  return {
    async GET(request: unknown) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const url = new URL((request as Request).url)
        const parsed = parseAdminAIAgentListQuery(url.searchParams, { allowScenario: false, allowStatus: false })
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        const data = await dependencies.getAdminAIAgentSkillBindingList({
          adminAccountId: admin.adminId,
          ...parsed.data,
        })
        return jsonSuccess(data, "Agent Skill 绑定列表读取成功")
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent Skill 绑定列表读取失败", 500)
      }
    },
    async POST(request: Request) {
      try {
        const admin = await requireAdmin(dependencies.getRequestAdmin, request)
        if (!admin.ok) {
          return admin.response
        }

        const parsed = parseAdminAIAgentSkillBindingBody(await request.json())
        if (!parsed.ok) {
          return jsonError(parsed.code, parsed.message, 400)
        }

        try {
          const data = await dependencies.createAdminAIAgentSkillBinding(admin.adminId, parsed.data)
          return jsonSuccess(data, "Agent Skill 绑定创建成功")
        } catch (error) {
          return mapCommonRouteError(error, "Agent Skill 绑定创建失败")
        }
      } catch {
        return jsonError("INTERNAL_ERROR", "Agent Skill 绑定创建失败", 500)
      }
    },
  }
}

export function createAdminAIAgentSkillBindingDetailPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateAdminAIAgentSkillBinding: (
    adminAccountId: string,
    bindingId: string,
    input: AdminAIAgentSkillBindingUpsertRequest,
  ) => Promise<unknown | null>
}) {
  return async function PATCH(
    request: Request,
    routeContext: { params: Promise<{ bindingId: string }> },
  ) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const { bindingId: rawId } = await routeContext.params
      const bindingId = parseUuidRoute(rawId, "Skill 绑定 ID")
      if (typeof bindingId !== "string") {
        return bindingId
      }

      const parsed = parseAdminAIAgentSkillBindingBody(await request.json())
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      try {
        const data = await dependencies.updateAdminAIAgentSkillBinding(admin.adminId, bindingId, parsed.data)
        if (!data) {
          return jsonError("NOT_FOUND", "Skill 绑定不存在。", 404)
        }
        return jsonSuccess(data, "Skill 绑定已更新")
      } catch (error) {
        return mapCommonRouteError(error, "Skill 绑定更新失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "Skill 绑定更新失败", 500)
    }
  }
}

export function createAdminAIInvocationListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIInvocationList: (filters: {
    adminAccountId: string
    keyword?: string
    status: "all" | "streaming" | "succeeded" | "failed" | "cancelled" | "timed_out"
    providerCode?: string
    modelCode?: string
    agentCode?: string
    dateRange: "24h" | "7d" | "30d" | "90d"
    page: number
    limit: number
  }) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const url = new URL((request as Request).url)
      const parsed = parseAdminAIInvocationListQuery(url.searchParams)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.getAdminAIInvocationList({
        adminAccountId: admin.adminId,
        ...parsed.data,
      })
      return jsonSuccess(data, "调用日志列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "调用日志列表读取失败", 500)
    }
  }
}

export function createAdminAIInvocationDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminAIInvocationDetail: (adminAccountId: string, invocationId: string) => Promise<unknown | null>
}) {
  return async function GET(
    request: unknown,
    routeContext: { params: Promise<{ invocationId: string }> },
  ) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const { invocationId: rawId } = await routeContext.params
      const invocationId = parseUuidRoute(rawId, "调用日志 ID")
      if (typeof invocationId !== "string") {
        return invocationId
      }

      const data = await dependencies.getAdminAIInvocationDetail(admin.adminId, invocationId)
      if (!data) {
        return jsonError("NOT_FOUND", "调用日志不存在。", 404)
      }

      return jsonSuccess(data, "调用日志详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "调用日志详情读取失败", 500)
    }
  }
}

export function createAdminAIResolvePreviewPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  resolveAdminAIPreview: (adminAccountId: string, input: AdminAIResolvePreviewRequest) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const parsed = parseAdminAIResolvePreviewBody(await request.json())
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      try {
        const data = await dependencies.resolveAdminAIPreview(admin.adminId, parsed.data)
        return jsonSuccess(data, "命中预览成功")
      } catch (error) {
        return mapCommonRouteError(error, "命中预览失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "命中预览失败", 500)
    }
  }
}

export function createAdminAITestPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  executeAdminAITest: (adminAccountId: string, input: AdminAITestRequest) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await requireAdmin(dependencies.getRequestAdmin, request)
      if (!admin.ok) {
        return admin.response
      }

      const parsed = parseAdminAITestBody(await request.json())
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      try {
        const data = await dependencies.executeAdminAITest(admin.adminId, parsed.data)
        return jsonSuccess(data, "AI 测试执行成功")
      } catch (error) {
        return mapCommonRouteError(error, "AI 测试执行失败")
      }
    } catch {
      return jsonError("INTERNAL_ERROR", "AI 测试执行失败", 500)
    }
  }
}
