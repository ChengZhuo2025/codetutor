import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPaymentOrderGetHandler } from "@/server/modules/payments/route-handler"
import { getPaymentOrderForUser } from "@/server/modules/payments/service"

const handler = createPaymentOrderGetHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  getPaymentOrderForUser,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return handler(request, context)
}
