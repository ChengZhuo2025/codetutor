import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIModelDetailHandlers } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIModelDetail, updateAdminAIModel } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIModelDetailHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIModelDetail,
  updateAdminAIModel,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ modelId: string }> },
) {
  return withNoStoreHeaders(await handlers.GET(request, context))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ modelId: string }> },
) {
  return withNoStoreHeaders(await handlers.PATCH(request, context))
}
