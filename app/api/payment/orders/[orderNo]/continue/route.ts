import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPaymentOrderContinuePostHandler } from "@/server/modules/payments/route-handler"
import { continuePaymentOrderForUser } from "@/server/modules/payments/service"

const handler = createPaymentOrderContinuePostHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  continuePaymentOrderForUser,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return handler(request, context)
}
