import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminFeedbackBatchDeletePostHandler } from "@/server/modules/feedback/route-handler"
import { adminBatchDeleteFeedback } from "@/server/modules/feedback/service"

const postHandler = createAdminFeedbackBatchDeletePostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  adminBatchDeleteFeedback,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
