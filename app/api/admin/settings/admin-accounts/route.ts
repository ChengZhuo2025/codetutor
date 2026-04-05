import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSettingsAccountListGetHandler } from "@/server/modules/admin-settings/route-handler"
import { getAdminSettingsAdminAccountList } from "@/server/modules/admin-settings/service"

const getHandler = createAdminSettingsAccountListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminSettingsAdminAccountList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
