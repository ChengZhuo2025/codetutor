import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withRequestObservability } from "@/server/lib/observability"
import { getClientIp } from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAuthLoginPostHandler } from "@/server/modules/auth/route-handler"
import { finalizeAuthLogin, recordLoginGeoSnapshot } from "@/server/modules/auth/service"

let request: NextRequest

const postHandler = createAuthLoginPostHandler({
  getRequestAuth: async (req) => {
    const auth = await getRequestAuth(req as NextRequest)

    if (!auth?.user) {
      return null
    }

    return {
      user: auth.user,
    }
  },
  getRequestAuthHelpText,
  finalizeAuthLogin: async (user, loginType) => {
    return finalizeAuthLogin(user, loginType, getClientIp(request))
  },
  schedulePostLoginSideEffects: (user, loginType) => {
    void recordLoginGeoSnapshot({
      userId: user.id,
      loginType,
      clientIp: getClientIp(request),
    }).catch((error) => {
      console.warn(
        "failed to record login geo snapshot:",
        error instanceof Error ? error.message : error,
      )
    })
  },
})

export async function POST(req: NextRequest) {
  request = req
  return withRequestObservability(
    {
      route: "/api/auth/login",
      feature: "auth",
      method: "POST",
    },
    async () => {
      const rateLimit = applyWindowRateLimit({
        bucket: "auth-login",
        key: getClientIp(request),
        max: 8,
        windowMs: 10 * 60_000,
        message: "登录请求过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await postHandler(request), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
