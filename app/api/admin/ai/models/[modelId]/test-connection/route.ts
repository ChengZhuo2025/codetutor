import type { NextRequest } from "next/server"
import { withRequestObservability } from "@/server/lib/observability"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAIModelTestConnectionPostHandler } from "@/server/modules/admin-ai/route-handler"
import { testAdminAIModelConnection } from "@/server/modules/admin-ai/service"

const handler = createAdminAIModelTestConnectionPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  testAdminAIModelConnection,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ modelId: string }> },
) {
  return withRequestObservability(
    {
      route: "/api/admin/ai/models/[modelId]/test-connection",
      feature: "admin-ai",
      method: "POST",
    },
    async () => {
      const admin = await getRequestAdmin(request)
      if (!admin.ok) {
        return withNoStoreHeaders(await handler(request, context))
      }

      const rateLimit = applyWindowRateLimit({
        bucket: "admin-ai-model-test-connection",
        key: admin.adminId,
        max: 30,
        windowMs: 10 * 60_000,
        message: "模型连接测试请求过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await handler(request, context), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
