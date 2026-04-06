import type { NextRequest } from "next/server"
import { POST_logout } from "@/server/modules/admin-auth/route-handler"
import { clearAdminSessionCaches } from "@/server/modules/admin-auth/service"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function POST(request: NextRequest) {
  clearAdminSessionCaches({
    accessToken: request.cookies.get("admin-access-token")?.value ?? null,
  })
  return withNoStoreHeaders(await POST_logout(request as never))
}
