import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteHelpCategoryPatchHandler } from "@/server/modules/admin-site/route-handler"
import { updateSiteHelpCategory } from "@/server/modules/admin-site/service"

const patchHandler = createAdminSiteHelpCategoryPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteHelpCategory,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
