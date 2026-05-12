import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { applyWindowRateLimit } from "@/server/lib/route-rate-limit"
import { createAlipayPrecreateOrderPostHandler } from "@/server/modules/payments/route-handler"
import { createAlipayPrecreateOrder } from "@/server/modules/payments/service"

const handler = createAlipayPrecreateOrderPostHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  createAlipayPrecreateOrder,
})

export async function POST(request: NextRequest) {
  // per-user 限流：10 次 / 分钟。避免前端连点或脚本刷单击穿支付宝 QPS 与 DB。
  const auth = await getRequestAuth(request)
  const rateLimitKey = auth?.userId ?? request.headers.get("x-forwarded-for") ?? "anonymous"
  const rateLimit = applyWindowRateLimit({
    bucket: "payment_create_order",
    key: rateLimitKey,
    max: 10,
    windowMs: 60_000,
    message: "下单过于频繁，请稍后再试。",
  })
  if (!rateLimit.ok) return rateLimit.response
  return handler(request)
}
