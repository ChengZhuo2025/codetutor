import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPaymentOrdersGetHandler } from "@/server/modules/payments/route-handler"
import { getPaymentOrdersForUser } from "@/server/modules/payments/service"

const handler = createPaymentOrdersGetHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  getPaymentOrdersForUser,
})

export async function GET(request: NextRequest) {
  return handler(request)
}
