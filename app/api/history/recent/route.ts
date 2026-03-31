import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createRecentHistoryGetHandler } from "@/server/modules/history/route-handler"
import { getRecentHistoryData } from "@/server/modules/history/service"

const getHandler = createRecentHistoryGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getRecentHistoryData,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
