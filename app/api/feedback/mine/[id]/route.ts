import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createMyFeedbackDetailGetHandler } from "@/server/modules/feedback/route-handler"
import { getMyFeedbackDetail } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const getHandler = createMyFeedbackDetailGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getMyFeedbackDetail,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return getHandler(request, context)
}
