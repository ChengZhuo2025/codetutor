import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAuthLoginPostHandler } from "@/server/modules/auth/route-handler"
import { finalizeAuthLogin } from "@/server/modules/auth/service"

const postHandler = createAuthLoginPostHandler({
  getRequestAuth: async (request) => {
    const auth = await getRequestAuth(request as NextRequest)

    if (!auth?.user) {
      return null
    }

    return {
      user: auth.user,
    }
  },
  getRequestAuthHelpText,
  finalizeAuthLogin,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
