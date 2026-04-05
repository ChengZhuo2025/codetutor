import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIInvocationDetailGetHandler } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIInvocationDetail } from "@/server/modules/admin-ai/service"

const getHandler = createAdminAIInvocationDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIInvocationDetail,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invocationId: string }> },
) {
  return withNoStoreHeaders(await getHandler(request, context))
}
