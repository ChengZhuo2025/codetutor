import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createCreateFeedbackPostHandler } from "@/server/modules/feedback/route-handler"
import { createFeedbackTicket } from "@/server/modules/feedback/service"

const postHandler = createCreateFeedbackPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  createFeedbackTicket,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
