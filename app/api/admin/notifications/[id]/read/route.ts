import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminNotificationReadPostHandler } from "@/server/modules/admin-notifications/route-handler"
import { markAdminNotificationRead } from "@/server/modules/admin-notifications/service"

const postHandler = createAdminNotificationReadPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  markAdminNotificationRead,
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withNoStoreHeaders(await postHandler(request, context))
}
