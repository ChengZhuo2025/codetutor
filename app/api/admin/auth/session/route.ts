import { GET_session } from "@/server/modules/admin-auth/route-handler"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function GET(request: Request) {
  return withNoStoreHeaders(await GET_session(request as never))
}
