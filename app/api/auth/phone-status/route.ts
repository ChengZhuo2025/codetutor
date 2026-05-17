import type { NextRequest } from "next/server"
import { withRequestObservability } from "@/server/lib/observability"
import { getClientIp } from "@/server/lib/request-fingerprint"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAuthPhoneStatusGetHandler } from "@/server/modules/auth/route-handler"
import { getPhoneRegistrationStatus } from "@/server/modules/auth/service"

const getHandler = createAuthPhoneStatusGetHandler({
  getPhoneRegistrationStatus,
})

export async function GET(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/auth/phone-status",
      feature: "auth",
      method: "GET",
    },
    async () => {
      const rateLimit = applyWindowRateLimit({
        bucket: "auth-phone-status",
        key: getClientIp(request),
        max: 20,
        windowMs: 10 * 60_000,
        message: "手机号状态检查过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await getHandler(request), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
