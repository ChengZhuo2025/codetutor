import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createWechatNativeOrderPostHandler } from "@/server/modules/payments/route-handler"
import { createWechatNativeOrder } from "@/server/modules/payments/service"

const handler = createWechatNativeOrderPostHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  createWechatNativeOrder,
})

export async function POST(request: NextRequest) {
  return handler(request)
}
