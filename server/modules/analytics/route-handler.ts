import type { AnalyticsTrackEventRequest, AnalyticsTrackEventResponseData } from "@/lib/api/contracts/analytics"
import { parseAnalyticsTrackEventBody } from "@/server/lib/request-validation"
import { jsonError, jsonSuccess } from "@/server/lib/route-response"

type RequestLike = {
  json: () => Promise<unknown>
}

export function createAnalyticsTrackEventPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  trackAnalyticsEvent: (
    input: AnalyticsTrackEventRequest,
    options?: { userId?: string | null },
  ) => Promise<AnalyticsTrackEventResponseData>
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)
      const input = parseAnalyticsTrackEventBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.trackAnalyticsEvent(input.data, {
        userId: auth?.userId ?? null,
      })

      return jsonSuccess(data)
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "事件写入失败",
        500,
      )
    }
  }
}
