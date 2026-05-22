import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningTemplateSyncPostHandler } from "@/server/modules/admin-learning-templates/route-handler"
import { syncUnstartedAdminLearningTemplate } from "@/server/modules/admin-learning-templates/service"

const postHandler = createAdminLearningTemplateSyncPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  syncUnstartedAdminLearningTemplate,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  return withNoStoreHeaders(await postHandler(request, context))
}
