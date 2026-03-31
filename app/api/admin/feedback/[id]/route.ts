import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminFeedbackDetailGetHandler } from "@/server/modules/feedback/route-handler"
import { getAdminFeedbackDetail } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const getHandler = createAdminFeedbackDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFeedbackDetail,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return getHandler(request, context)
}
