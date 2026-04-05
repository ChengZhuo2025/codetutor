import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSettingsAccountStatusPostHandler } from "@/server/modules/admin-settings/route-handler"
import { updateAdminSettingsAdminAccountStatus } from "@/server/modules/admin-settings/service"

const postHandler = createAdminSettingsAccountStatusPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminSettingsAdminAccountStatus,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ adminAccountId: string }> },
) {
  return withNoStoreHeaders(await postHandler(request, context))
}
