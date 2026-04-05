import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningPathExportGetHandler } from "@/server/modules/admin-learning/route-handler"
import { getAdminLearningPathExportCsv } from "@/server/modules/admin-learning/service"

const getHandler = createAdminLearningPathExportGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningPathExportCsv,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
