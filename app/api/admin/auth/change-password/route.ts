import type { NextRequest } from "next/server"

import { POST_change_password } from "@/server/modules/admin-auth/route-handler"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await POST_change_password(request))
}
