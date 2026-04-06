import type { NextRequest } from "next/server"
import { withRequestObservability } from "@/server/lib/observability"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIProviderSecretRevealPostHandler } from "@/server/modules/admin-ai/route-handler"
import { revealAdminAIProviderSecret } from "@/server/modules/admin-ai/service"

const handler = createAdminAIProviderSecretRevealPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  revealAdminAIProviderSecret,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ providerId: string }> },
) {
  return withRequestObservability(
    {
      route: "/api/admin/ai/providers/[providerId]/reveal-secret",
      feature: "admin-ai",
      method: "POST",
    },
    async () => {
      const admin = await getRequestAdmin(request)
      if (!admin.ok) {
        return withNoStoreHeaders(await handler(request, context))
      }

      const rateLimit = applyWindowRateLimit({
        bucket: "admin-ai-provider-reveal-secret",
        key: admin.adminId,
        max: 10,
        windowMs: 10 * 60_000,
        message: "Provider 密钥读取过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await handler(request, context), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
