import type { NextRequest } from "next/server"
import { withRequestObservability } from "@/server/lib/observability"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { applyWindowRateLimit, attachRateLimitHeaders } from "@/server/lib/route-rate-limit"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAITestPostHandler } from "@/server/modules/admin-ai/route-handler"
import { executeAdminAITest } from "@/server/modules/admin-ai/service"

const postHandler = createAdminAITestPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  executeAdminAITest,
})

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/admin/ai/agent/test",
      feature: "admin-ai",
      method: "POST",
    },
    async () => {
      const admin = await getRequestAdmin(request)
      if (!admin.ok) {
        return withNoStoreHeaders(await postHandler(request))
      }

      const rateLimit = applyWindowRateLimit({
        bucket: "admin-ai-agent-test",
        key: admin.adminId,
        max: 5,
        windowMs: 60_000,
        message: "AI 测试调用过于频繁，请稍后再试。",
      })

      if (!rateLimit.ok) {
        return withNoStoreHeaders(rateLimit.response)
      }

      const response = attachRateLimitHeaders(await postHandler(request), rateLimit.headers)
      return withNoStoreHeaders(response)
    },
  )
}
