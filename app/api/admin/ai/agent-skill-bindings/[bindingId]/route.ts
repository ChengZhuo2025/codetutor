import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIAgentSkillBindingDetailPatchHandler } from "@/server/modules/admin-ai/route-handler"
import { updateAdminAIAgentSkillBinding } from "@/server/modules/admin-ai/service"

const patchHandler = createAdminAIAgentSkillBindingDetailPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminAIAgentSkillBinding,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bindingId: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
