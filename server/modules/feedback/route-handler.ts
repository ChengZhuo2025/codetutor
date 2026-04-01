import {
  jsonFeedbackRecordNotFound,
  jsonFeedbackTicketNotFound,
  jsonInvalidAdminReplyBody,
  jsonInvalidAdminStatusBody,
  jsonInvalidFeedbackTicketId,
  ROUTE_ERROR_MESSAGES,
} from "../../lib/route-error-presets.ts"
import {
  jsonInternalErrorFromError,
} from "../../lib/route-error.ts"
import {
  jsonAdminAuthError,
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import {
  parseAdminFeedbackListQuery,
  parseAdminReplyFeedbackBody,
  parseAdminUpdateFeedbackStatusBody,
  parseCreateFeedbackBody,
  parseRequiredRouteId,
} from "../../lib/request-validation.ts"

type RequestLike = {
  json: () => Promise<unknown>
}

type GetRequestLike = {
  url: string
}

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type CreateFeedbackTicket = (
  userId: string,
  input: {
    feedbackType: "visual_design" | "interaction_flow" | "feature_request" | "issue_report"
    title: string
    content: string
    contactMethod?: string | null
    source?: "settings_popover" | "history_sidebar" | null
  },
) => Promise<unknown>

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

export function createCreateFeedbackPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  createFeedbackTicket: CreateFeedbackTicket
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseCreateFeedbackBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.createFeedbackTicket(auth.userId, input.data)
      return jsonSuccess(data, "feedback created")
    } catch (error) {
      return jsonInternalErrorFromError(error, "提交反馈失败")
    }
  }
}

export function createMyFeedbackDetailGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getMyFeedbackDetail: (userId: string, ticketId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown, context: RouteContext) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidFeedbackTicketId)

      if (!routeId.ok) {
        return jsonInvalidFeedbackTicketId()
      }

      const data = await dependencies.getMyFeedbackDetail(auth.userId, routeId.data)

      if (!data) {
        return jsonFeedbackRecordNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载反馈详情失败")
    }
  }
}

export function createAdminFeedbackListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminFeedbackList: (filters: {
    status?: "submitted" | "in_review" | "replied" | "closed"
    feedbackType?: "visual_design" | "interaction_flow" | "feature_request" | "issue_report"
    keyword?: string
    userId?: string
    limit?: number
  }) => Promise<unknown>
}) {
  return async function GET(request: GetRequestLike) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonAdminAuthError(admin as Exclude<RequestAdminResult, { ok: true }>)
      }

      const input = parseAdminFeedbackListQuery(new URL(request.url).searchParams)

      if (!input.ok) {
        return jsonError("VALIDATION_FAILED", input.message, 400)
      }

      const data = await dependencies.getAdminFeedbackList(input.data)

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载管理员反馈列表失败")
    }
  }
}

export function createAdminFeedbackDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  getAdminFeedbackDetail: (ticketId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown, context: RouteContext) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonAdminAuthError(admin as Exclude<RequestAdminResult, { ok: true }>)
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidFeedbackTicketId)

      if (!routeId.ok) {
        return jsonInvalidFeedbackTicketId()
      }

      const data = await dependencies.getAdminFeedbackDetail(routeId.data)

      if (!data) {
        return jsonFeedbackTicketNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载管理员反馈详情失败")
    }
  }
}

export function createAdminReplyFeedbackPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  adminReplyFeedback: (
    ticketId: string,
    input: {
      content: string
      status?: "submitted" | "in_review" | "replied" | "closed"
    },
    adminId: string,
  ) => Promise<unknown>
}) {
  return async function POST(request: RequestLike, context: RouteContext) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonAdminAuthError(admin as Exclude<RequestAdminResult, { ok: true }>)
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidAdminReplyBody)
      const input = parseAdminReplyFeedbackBody(await request.json())

      if (!routeId.ok) {
        return jsonInvalidAdminReplyBody()
      }

      if (!input.ok && input.code === "VALIDATION_FAILED") {
        return jsonError(input.code, input.message, 400)
      }

      if (!input.ok) {
        return jsonInvalidAdminReplyBody()
      }

      const data = await dependencies.adminReplyFeedback(routeId.data, input.data, admin.adminId)

      if (!data) {
        return jsonFeedbackTicketNotFound()
      }

      return jsonSuccess(data, "feedback replied")
    } catch (error) {
      return jsonInternalErrorFromError(error, "管理员回复反馈失败")
    }
  }
}

export function createAdminUpdateFeedbackStatusPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  adminUpdateFeedbackStatus: (
    ticketId: string,
    input: {
      status: "submitted" | "in_review" | "replied" | "closed"
    },
  ) => Promise<unknown>
}) {
  return async function POST(request: RequestLike, context: RouteContext) {
    try {
      const admin = await dependencies.getRequestAdmin(request)

      if (!admin.ok) {
        return jsonAdminAuthError(admin as Exclude<RequestAdminResult, { ok: true }>)
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidAdminStatusBody)
      const input = parseAdminUpdateFeedbackStatusBody(await request.json())

      if (!routeId.ok || !input.ok) {
        return jsonInvalidAdminStatusBody()
      }

      const data = await dependencies.adminUpdateFeedbackStatus(routeId.data, input.data)

      if (!data) {
        return jsonFeedbackTicketNotFound()
      }

      return jsonSuccess(data, "feedback status updated")
    } catch (error) {
      return jsonInternalErrorFromError(error, "管理员更新反馈状态失败")
    }
  }
}
