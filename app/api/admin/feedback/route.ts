import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminFeedbackListGetHandler } from "@/server/modules/feedback/route-handler"
import { getAdminFeedbackList } from "@/server/modules/feedback/service"

const getHandler = createAdminFeedbackListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFeedbackList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
