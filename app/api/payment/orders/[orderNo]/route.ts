import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import {
  createPaymentOrderDeleteHandler,
  createPaymentOrderGetHandler,
} from "@/server/modules/payments/route-handler"
import {
  getPaymentOrderForUser,
  softDeletePaymentOrderForUser,
} from "@/server/modules/payments/service"

const handler = createPaymentOrderGetHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  getPaymentOrderForUser,
})

const deleteHandler = createPaymentOrderDeleteHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  softDeletePaymentOrderForUser,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return handler(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return deleteHandler(request, context)
}
