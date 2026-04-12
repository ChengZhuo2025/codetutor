import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { withRequestObservability } from "@/server/lib/observability"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { restartLearningConversationForCurrentTask } from "@/server/modules/learning/service"

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/learning/restart-conversation",
      feature: "learning",
      method: "POST",
    },
    async () => {
      const auth = await getRequestAuth(request)

      if (!auth) {
        return withNoStoreHeaders(fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401))
      }

      const windowLimit = applyWindowRateLimit({
        bucket: "learning-restart-conversation",
        key: auth.userId,
        max: 10,
        windowMs: 60_000,
        message: "操作过于频繁，请稍后再试。",
      })
      if (!windowLimit.ok) {
        return withNoStoreHeaders(windowLimit.response)
      }

      try {
        const data = await restartLearningConversationForCurrentTask(auth.userId)

        if (!data) {
          return withNoStoreHeaders(
            attachRateLimitHeaders(
              fail("NOT_FOUND", "当前用户还没有可恢复的学习任务。", 404),
              windowLimit.headers,
            ),
          )
        }

        return withNoStoreHeaders(
          attachRateLimitHeaders(ok(data), windowLimit.headers),
        )
      } catch (error) {
        return withNoStoreHeaders(
          attachRateLimitHeaders(
            fail(
              "INTERNAL_ERROR",
              error instanceof Error ? error.message : "重置学习对话失败",
              500,
            ),
            windowLimit.headers,
          ),
        )
      }
    },
  )
}
