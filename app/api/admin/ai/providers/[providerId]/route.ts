import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIProviderDetailHandlers } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIProviderDetail, updateAdminAIProvider } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIProviderDetailHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIProviderDetail,
  updateAdminAIProvider,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ providerId: string }> },
) {
  return withNoStoreHeaders(await handlers.GET(request, context))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ providerId: string }> },
) {
  return withNoStoreHeaders(await handlers.PATCH(request, context))
}
