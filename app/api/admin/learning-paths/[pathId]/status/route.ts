import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningPathStatusPostHandler } from "@/server/modules/admin-learning/route-handler"
import { updateAdminLearningPathStatus } from "@/server/modules/admin-learning/service"

type RouteContext = {
  params: Promise<{
    pathId: string
  }>
}

const postHandler = createAdminLearningPathStatusPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminLearningPathStatus,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await postHandler(request, context))
}
