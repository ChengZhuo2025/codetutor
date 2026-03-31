import {
  jsonHistoryPlanNotFound,
  jsonInvalidHistoryPlanId,
  ROUTE_ERROR_MESSAGES,
} from "../../lib/route-error-presets.ts"
import {
  jsonInternalErrorFromError,
  mapRouteError,
} from "../../lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import {
  parseHistoryRecentQuery,
  parseRequiredRouteId,
  parseUpdateHistoryStatusBody,
} from "../../lib/request-validation.ts"

type RequestLike = {
  json: () => Promise<unknown>
}

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type UpdateHistoryPlanStatus = (
  userId: string,
  pathId: string,
  action: "abandon" | "reactivate" | "archive",
) => Promise<unknown>

type GetRecentHistoryData = (
  userId: string,
  page: number,
  pageSize: number,
  filter: "all" | "in_progress" | "interrupted" | "completed" | "abandoned",
) => Promise<unknown>

type GetHistoryDetail = (
  userId: string,
  pathId: string,
) => Promise<unknown>

export function createRecentHistoryGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getRecentHistoryData: GetRecentHistoryData
}) {
  return async function GET(request: { url: string }) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = new URL(request.url).searchParams
      const parsed = parseHistoryRecentQuery(input)
      const data = await dependencies.getRecentHistoryData(
        auth.userId,
        parsed.data.page,
        parsed.data.pageSize,
        parsed.data.filter,
      )

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载学习历史失败")
    }
  }
}

export function createHistoryDetailGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getHistoryDetail: GetHistoryDetail
}) {
  return async function GET(request: unknown, context: RouteContext) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidHistoryPlanId)

      if (!routeId.ok) {
        return jsonInvalidHistoryPlanId()
      }

      const data = await dependencies.getHistoryDetail(auth.userId, routeId.data)

      if (!data) {
        return jsonHistoryPlanNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载学习计划详情失败")
    }
  }
}

export function createUpdateHistoryStatusPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  updateHistoryPlanStatus: UpdateHistoryPlanStatus
}) {
  return async function POST(request: RequestLike, context: RouteContext) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const { id } = await context.params
      const routeId = parseRequiredRouteId(id, ROUTE_ERROR_MESSAGES.invalidHistoryPlanId)

      if (!routeId.ok) {
        return jsonInvalidHistoryPlanId()
      }

      const input = parseUpdateHistoryStatusBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.updateHistoryPlanStatus(
        auth.userId,
        routeId.data,
        input.data.action,
      )

      if (!data) {
        return jsonHistoryPlanNotFound()
      }

      return jsonSuccess(data, "history plan updated")
    } catch (error) {
      return mapRouteError(error, "更新学习计划状态失败", [
        {
          name: "CONFLICT",
          code: "CONFLICT",
          status: 409,
        },
        {
          code: "VALIDATION_FAILED",
          status: 400,
          messageIncludes: ["只有", "不能直接删除", "当前已有进行中的学习计划"],
        },
      ])
    }
  }
}
