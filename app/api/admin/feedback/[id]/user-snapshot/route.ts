import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminFeedbackUserSnapshotGetHandler } from "@/server/modules/feedback/route-handler"
import { getAdminFeedbackUserSnapshot } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const getHandler = createAdminFeedbackUserSnapshotGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFeedbackUserSnapshot,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await getHandler(request, context))
}
