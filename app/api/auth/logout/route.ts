import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAuthLogoutPostHandler } from "@/server/modules/auth/route-handler"

const postHandler = createAuthLogoutPostHandler()

export async function POST() {
  return withNoStoreHeaders(await postHandler())
}
