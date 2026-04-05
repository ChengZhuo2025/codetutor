import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIAgentDetailHandlers } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIAgentDetail, updateAdminAIAgent } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIAgentDetailHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIAgentDetail,
  updateAdminAIAgent,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  return withNoStoreHeaders(await handlers.GET(request, context))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  return withNoStoreHeaders(await handlers.PATCH(request, context))
}
