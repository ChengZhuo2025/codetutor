import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIModelListHandler } from "@/server/modules/admin-ai/route-handler"
import { createAdminAIModel, getAdminAIModelList } from "@/server/modules/admin-ai/service"

const handlers = createAdminAIModelListHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIModelList,
  createAdminAIModel,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await handlers.GET(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await handlers.POST(request))
}
