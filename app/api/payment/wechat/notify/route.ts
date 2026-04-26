import { createWechatPaymentNotifyPostHandler } from "@/server/modules/payments/route-handler"
import { handleWechatPaymentNotify } from "@/server/modules/payments/service"

const handler = createWechatPaymentNotifyPostHandler({
  handleWechatPaymentNotify,
})

export async function POST(request: Request) {
  return handler(request)
}
