import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminLearningTemplateListHandlers } from "@/server/modules/admin-learning-templates/route-handler"
import {
  createAdminLearningTemplate,
  getAdminLearningTemplateList,
} from "@/server/modules/admin-learning-templates/service"

const handlers = createAdminLearningTemplateListHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminLearningTemplateList,
  createAdminLearningTemplate,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await handlers.GET(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await handlers.POST(request))
}
