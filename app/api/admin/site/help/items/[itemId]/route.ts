import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteHelpItemPatchHandler } from "@/server/modules/admin-site/route-handler"
import { updateSiteHelpItem } from "@/server/modules/admin-site/service"

const patchHandler = createAdminSiteHelpItemPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteHelpItem,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
