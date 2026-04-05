import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIAgentBindingListHandler } from "@/server/modules/admin-ai/route-handler"
import { createAdminAIAgentBinding, getAdminAIAgentBindingList } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIAgentBindingListHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIAgentBindingList,
  createAdminAIAgentBinding,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await handlers.GET(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await handlers.POST(request))
}
