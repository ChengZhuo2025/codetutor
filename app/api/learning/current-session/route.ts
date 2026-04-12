import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createLearningCurrentSessionGetHandler } from "@/server/modules/learning/route-handler"
import { getLearningCurrentSessionData } from "@/server/modules/learning/service"

const getHandler = createLearningCurrentSessionGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getLearningCurrentSessionData,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
