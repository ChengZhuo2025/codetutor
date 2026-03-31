import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminReplyFeedbackPostHandler } from "@/server/modules/feedback/route-handler"
import { adminReplyFeedback } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const postHandler = createAdminReplyFeedbackPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  adminReplyFeedback,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return postHandler(request, context)
}
