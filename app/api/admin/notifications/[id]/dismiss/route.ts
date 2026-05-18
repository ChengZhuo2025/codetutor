import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminNotificationDismissPostHandler } from "@/server/modules/admin-notifications/route-handler"
import { dismissAdminNotification } from "@/server/modules/admin-notifications/service"

const postHandler = createAdminNotificationDismissPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  dismissAdminNotification,
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withNoStoreHeaders(await postHandler(request, context))
}
