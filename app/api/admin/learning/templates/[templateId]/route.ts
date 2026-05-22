import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningTemplateDetailHandlers } from "@/server/modules/admin-learning-templates/route-handler"
import {
  getAdminLearningTemplateDetail,
  updateAdminLearningTemplate,
} from "@/server/modules/admin-learning-templates/service"

const handlers = createAdminLearningTemplateDetailHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningTemplateDetail,
  updateAdminLearningTemplate,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  return withNoStoreHeaders(await handlers.GET(request, context))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  return withNoStoreHeaders(await handlers.PATCH(request, context))
}
