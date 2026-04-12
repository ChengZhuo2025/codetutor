import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningPathSessionDetailGetHandler } from "@/server/modules/admin-learning/route-handler"
import { getAdminLearningPathSessionDetail } from "@/server/modules/admin-learning/service"

type RouteContext = {
  params: Promise<{
    pathId: string
    sessionId: string
  }>
}

const getHandler = createAdminLearningPathSessionDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningPathSessionDetail,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await getHandler(request, context))
}
