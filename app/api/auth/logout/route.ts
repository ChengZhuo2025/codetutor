import type { NextRequest } from "next/server"
import { clearRequestAuthCache } from "@/server/lib/request-auth"
import { getBearerTokenFromHeaders } from "@/server/lib/request-fingerprint"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAuthLogoutPostHandler } from "@/server/modules/auth/route-handler"

const postHandler = createAuthLogoutPostHandler()

export async function POST(request: NextRequest) {
  clearRequestAuthCache(getBearerTokenFromHeaders(request.headers))
  return withNoStoreHeaders(await postHandler())
}
