import { createAlipayNotifyPostHandler } from "@/server/modules/payments/route-handler"
import { handleAlipayPaymentNotify } from "@/server/modules/payments/service"

const handler = createAlipayNotifyPostHandler({
  handleAlipayPaymentNotify,
})

export async function POST(request: Request) {
  return handler(request)
}
