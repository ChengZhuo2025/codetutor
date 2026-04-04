import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminUserRestorePostHandler } from "@/server/modules/admin-users/route-handler"
import { restoreAdminUser } from "@/server/modules/admin-users/service"

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

const postHandler = createAdminUserRestorePostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  restoreAdminUser,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await postHandler(request, context))
}
