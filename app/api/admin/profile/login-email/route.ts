import type { NextRequest } from "next/server"

import { PATCH_login_email } from "@/server/modules/admin-auth/route-handler"
import { withNoStoreHeaders } from "@/server/lib/response-cache"

export async function PATCH(request: NextRequest) {
  return withNoStoreHeaders(await PATCH_login_email(request))
}
