import type { NextRequest } from "next/server"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createInAppNotificationListGetHandler } from "@/server/modules/notifications/route-handler"
import { listInAppNotifications } from "@/server/modules/notifications/service"

const getHandler = createInAppNotificationListGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  listInAppNotifications,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
