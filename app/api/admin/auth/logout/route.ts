import { POST_logout } from "@/server/modules/admin-auth/route-handler"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function POST(request: Request) {
  return withNoStoreHeaders(await POST_logout(request as never))
}
