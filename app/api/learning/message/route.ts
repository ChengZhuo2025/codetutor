import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import {
  executeLearningMessageRequest,
} from "@/server/modules/learning/http-logic"
import {
  createLearningMessagePostHandler,
} from "@/server/modules/learning/route-handler"
import {
  sendLearningMessage,
} from "@/server/modules/learning/service"
import { streamLearningMessage } from "@/server/modules/learning/orchestration"

const postHandler = createLearningMessagePostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  executeLearningMessageRequest,
  sendLearningMessage,
  streamLearningMessage,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
