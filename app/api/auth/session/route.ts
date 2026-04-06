import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { withRequestObservability } from "@/server/lib/observability"
import {
  getBearerTokenFromHeaders,
  getClientIp,
  hashSensitiveValue,
} from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { isUserAccountDisabledError } from "@/server/lib/user-account-disabled"
import { getAuthSessionSummary } from "@/server/modules/auth/service"

export async function GET(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/auth/session",
      feature: "auth",
      method: "GET",
    },
    async () => {
      const bearerToken = getBearerTokenFromHeaders(request.headers)
      const rateKey = bearerToken
        ? `token:${hashSensitiveValue(bearerToken)}`
        : `ip:${getClientIp(request)}`
      const rateLimit = applyWindowRateLimit({
        bucket: "auth-session",
        key: rateKey,
        max: 60,
        windowMs: 60_000,
        message: "会话读取过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      try {
        const auth = await getRequestAuth(request)

        if (!auth) {
          return withNoStoreHeaders(
            attachRateLimitHeaders(fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401), rateLimit.headers),
          )
        }

        const data = await getAuthSessionSummary(auth.userId)

        return withNoStoreHeaders(attachRateLimitHeaders(ok(data), rateLimit.headers))
      } catch (error) {
        if (isUserAccountDisabledError(error)) {
          return withNoStoreHeaders(
            attachRateLimitHeaders(fail(error.code, error.message, 403), rateLimit.headers),
          )
        }
        return withNoStoreHeaders(
          attachRateLimitHeaders(
            fail(
              "INTERNAL_ERROR",
              error instanceof Error ? error.message : "加载当前登录状态失败",
              500,
            ),
            rateLimit.headers,
          ),
        )
      }
    },
  )
}
