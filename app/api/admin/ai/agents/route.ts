import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIAgentListHandler } from "@/server/modules/admin-ai/route-handler"
import { createAdminAIAgent, getAdminAIAgentList } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIAgentListHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIAgentList,
  createAdminAIAgent,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await handlers.GET(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await handlers.POST(request))
}
