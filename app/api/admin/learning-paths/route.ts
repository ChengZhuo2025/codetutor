import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningPathListGetHandler } from "@/server/modules/admin-learning/route-handler"
import { getAdminLearningPathList } from "@/server/modules/admin-learning/service"

const getHandler = createAdminLearningPathListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningPathList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
