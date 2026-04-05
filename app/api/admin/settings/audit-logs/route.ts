import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSettingsAuditLogListGetHandler } from "@/server/modules/admin-settings/route-handler"
import { getAdminSettingsAuditLogList } from "@/server/modules/admin-settings/service"

const getHandler = createAdminSettingsAuditLogListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminSettingsAuditLogList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
