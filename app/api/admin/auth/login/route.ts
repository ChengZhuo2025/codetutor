import type { NextRequest } from "next/server"
import { POST_login } from "@/server/modules/admin-auth/route-handler"
import { withRequestObservability } from "@/server/lib/observability"
import { getClientIp } from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/admin/auth/login",
      feature: "admin-auth",
      method: "POST",
    },
    async () => {
      const rateLimit = applyWindowRateLimit({
        bucket: "admin-auth-login",
        key: getClientIp(request),
        max: 5,
        windowMs: 10 * 60_000,
        message: "管理员登录请求过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await POST_login(request as never), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
