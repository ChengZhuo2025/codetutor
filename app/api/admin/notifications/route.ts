import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminNotificationListGetHandler } from "@/server/modules/admin-notifications/route-handler"
import { listAdminNotifications } from "@/server/modules/admin-notifications/service"

const getHandler = createAdminNotificationListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  listAdminNotifications,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
