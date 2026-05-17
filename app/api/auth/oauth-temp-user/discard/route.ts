import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withRequestObservability } from "@/server/lib/observability"
import { getClientIp } from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createOAuthTempUserDiscardPostHandler } from "@/server/modules/auth/route-handler"
import { discardOAuthTempUser } from "@/server/modules/auth/service"

const postHandler = createOAuthTempUserDiscardPostHandler({
  getRequestAuth: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)

    if (!auth?.user) {
      return null
    }

    return {
      user: auth.user,
    }
  },
  getRequestAuthHelpText,
  discardOAuthTempUser,
})

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/auth/oauth-temp-user/discard",
      feature: "auth",
      method: "POST",
    },
    async () => {
      const rateLimit = applyWindowRateLimit({
        bucket: "auth-oauth-temp-discard",
        key: getClientIp(request),
        max: 8,
        windowMs: 10 * 60_000,
        message: "扫码账号处理请求过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await postHandler(request), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
