import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminUpdateFeedbackStatusPostHandler } from "@/server/modules/feedback/route-handler"
import { adminUpdateFeedbackStatus } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const postHandler = createAdminUpdateFeedbackStatusPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  adminUpdateFeedbackStatus,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return postHandler(request, context)
}
