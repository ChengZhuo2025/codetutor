import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createSubscriptionMeGetHandler } from "@/server/modules/payments/route-handler"
import { getSubscriptionForUser } from "@/server/modules/payments/service"

const handler = createSubscriptionMeGetHandler({
  getRequestUser: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)
    return auth
      ? { ok: true, userId: auth.userId }
      : { ok: false, message: getRequestAuthHelpText() }
  },
  getSubscriptionForUser,
})

export async function GET(request: NextRequest) {
  return handler(request)
}
