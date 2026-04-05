import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIAgentBindingDetailPatchHandler } from "@/server/modules/admin-ai/route-handler"
import { updateAdminAIAgentBinding } from "@/server/modules/admin-ai/service"

const patchHandler = createAdminAIAgentBindingDetailPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminAIAgentBinding,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bindingId: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
