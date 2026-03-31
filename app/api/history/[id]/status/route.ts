import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createUpdateHistoryStatusPostHandler } from "@/server/modules/history/route-handler"
import { updateHistoryPlanStatus } from "@/server/modules/history/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const postHandler = createUpdateHistoryStatusPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  updateHistoryPlanStatus,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return postHandler(request, context)
}
