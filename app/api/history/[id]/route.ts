import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createHistoryDetailGetHandler } from "@/server/modules/history/route-handler"
import { getHistoryDetail } from "@/server/modules/history/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const getHandler = createHistoryDetailGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getHistoryDetail,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return getHandler(request, context)
}
