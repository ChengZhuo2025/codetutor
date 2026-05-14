import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withRequestObservability } from "@/server/lib/observability"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createLearningMessageSpeechPostHandler } from "@/server/modules/learning/route-handler"
import { synthesizeLearningMessageSpeech } from "@/server/modules/learning/speech"

const postHandler = createLearningMessageSpeechPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  synthesizeLearningMessageSpeech,
})

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/learning/message-speech",
      feature: "learning",
      method: "POST",
    },
    async () => {
      const auth = await getRequestAuth(request)
      if (!auth) {
        return withNoStoreHeaders(await postHandler(request))
      }

      const windowLimit = applyWindowRateLimit({
        bucket: "learning-message-speech",
        key: auth.userId,
        max: 20,
        windowMs: 60_000,
        message: "语音播读请求过于频繁，请稍后再试。",
      })
      if (!windowLimit.ok) {
        return withNoStoreHeaders(windowLimit.response)
      }

      const response = attachRateLimitHeaders(await postHandler(request), windowLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
