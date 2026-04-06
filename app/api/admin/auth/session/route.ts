import type { NextRequest } from "next/server"
import { GET_session } from "@/server/modules/admin-auth/route-handler"
import { withRequestObservability } from "@/server/lib/observability"
import { getClientIp, hashSensitiveValue } from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function GET(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/admin/auth/session",
      feature: "admin-auth",
      method: "GET",
    },
    async () => {
      const accessToken = request.cookies.get("admin-access-token")?.value?.trim() || null
      const rateKey = accessToken
        ? `token:${hashSensitiveValue(accessToken)}`
        : `ip:${getClientIp(request)}`
      const rateLimit = applyWindowRateLimit({
        bucket: "admin-auth-session",
        key: rateKey,
        max: 60,
        windowMs: 60_000,
        message: "管理员会话读取过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await GET_session(request as never), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
