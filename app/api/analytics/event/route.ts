import type { NextRequest } from "next/server"
import { createAnalyticsTrackEventPostHandler } from "@/server/modules/analytics/route-handler"
import { trackAnalyticsEvent } from "@/server/modules/analytics/service"
import { getRequestAuth } from "@/server/lib/request-auth"

const postHandler = createAnalyticsTrackEventPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  trackAnalyticsEvent,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
