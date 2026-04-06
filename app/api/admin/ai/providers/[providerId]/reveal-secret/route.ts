import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIProviderSecretRevealPostHandler } from "@/server/modules/admin-ai/route-handler"
import { revealAdminAIProviderSecret } from "@/server/modules/admin-ai/service"

const handler = createAdminAIProviderSecretRevealPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  revealAdminAIProviderSecret,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ providerId: string }> },
) {
  return withNoStoreHeaders(await handler(request, context))
}
