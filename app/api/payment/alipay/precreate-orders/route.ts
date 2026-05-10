import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
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
  return handler(request)
}
