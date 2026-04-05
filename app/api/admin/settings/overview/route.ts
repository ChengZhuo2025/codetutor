import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSettingsOverviewGetHandler } from "@/server/modules/admin-settings/route-handler"
import { getAdminSettingsOverview } from "@/server/modules/admin-settings/service"

const getHandler = createAdminSettingsOverviewGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminSettingsOverview,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
