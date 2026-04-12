import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningPathSessionListGetHandler } from "@/server/modules/admin-learning/route-handler"
import { getAdminLearningPathSessionList } from "@/server/modules/admin-learning/service"

type RouteContext = {
  params: Promise<{
    pathId: string
  }>
}

const getHandler = createAdminLearningPathSessionListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningPathSessionList,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await getHandler(request, context))
}
