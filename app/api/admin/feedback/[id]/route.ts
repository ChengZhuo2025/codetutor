import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminFeedbackDeleteHandler,
  createAdminFeedbackDetailGetHandler,
} from "@/server/modules/feedback/route-handler"
import { adminDeleteFeedback, getAdminFeedbackDetail } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const getHandler = createAdminFeedbackDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFeedbackDetail,
})

const deleteHandler = createAdminFeedbackDeleteHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  adminDeleteFeedback,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await getHandler(request, context))
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await deleteHandler(request, context))
}
