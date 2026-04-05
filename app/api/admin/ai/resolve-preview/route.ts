import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIResolvePreviewPostHandler } from "@/server/modules/admin-ai/route-handler"
import { resolveAdminAIPreview } from "@/server/modules/admin-ai/service"

const postHandler = createAdminAIResolvePreviewPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  resolveAdminAIPreview,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
