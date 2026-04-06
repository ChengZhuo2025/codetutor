import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withRequestObservability } from "@/server/lib/observability"
import {
  applyConcurrencyLimit,
  applyWindowRateLimit,
  attachRateLimitHeaders,
  wrapResponseWithConcurrencyLease,
} from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
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
  return withRequestObservability(
    {
      route: "/api/learning/message",
      feature: "learning",
      method: "POST",
    },
    async () => {
      const auth = await getRequestAuth(request)
      if (!auth) {
        return withNoStoreHeaders(await postHandler(request))
      }

      const windowLimit = applyWindowRateLimit({
        bucket: "learning-message",
        key: auth.userId,
        max: 12,
        windowMs: 60_000,
        message: "当前发送频率过高，请稍后再试。",
      })
      if (!windowLimit.ok) {
        return withNoStoreHeaders(windowLimit.response)
      }

      const concurrencyLimit = applyConcurrencyLimit({
        bucket: "learning-message-concurrency",
        key: auth.userId,
        maxConcurrent: 2,
        message: "当前学习会话处理中，请等待上一条回复完成后再试。",
      })
      if (!concurrencyLimit.ok) {
        return withNoStoreHeaders(concurrencyLimit.response)
      }

      try {
        let response = await postHandler(request)
        response = attachRateLimitHeaders(response, windowLimit.headers)
        response = wrapResponseWithConcurrencyLease(response, concurrencyLimit.lease.release)
        return withNoStoreHeaders(response)
      } catch (error) {
        concurrencyLimit.lease.release()
        throw error
      }
    },
  )
}
