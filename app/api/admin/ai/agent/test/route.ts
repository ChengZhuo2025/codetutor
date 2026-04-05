import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAITestPostHandler } from "@/server/modules/admin-ai/route-handler"
import { executeAdminAITest } from "@/server/modules/admin-ai/service"

const postHandler = createAdminAITestPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  executeAdminAITest,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
