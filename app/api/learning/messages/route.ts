import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createLearningMessagesGetHandler } from "@/server/modules/learning/route-handler"
import { getLearningMessagesPage } from "@/server/modules/learning/service"

const getHandler = createLearningMessagesGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getLearningMessagesPage,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
