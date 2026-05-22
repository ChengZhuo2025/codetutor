import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningTemplateGeneratePostHandler } from "@/server/modules/admin-learning-templates/route-handler"
import { generateAdminLearningTemplate } from "@/server/modules/admin-learning-templates/service"

const postHandler = createAdminLearningTemplateGeneratePostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  generateAdminLearningTemplate,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
