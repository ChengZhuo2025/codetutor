import { POST_login } from "@/server/modules/admin-auth/route-handler"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function POST(request: Request) {
  return withNoStoreHeaders(await POST_login(request as never))
}
