import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminUserDetailGetHandler,
  createAdminUserPatchHandler,
} from "@/server/modules/admin-users/route-handler"
import { getAdminUserDetail, updateAdminUser } from "@/server/modules/admin-users/service"

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

const getHandler = createAdminUserDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminUserDetail,
})

const patchHandler = createAdminUserPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminUser,
})

export async function GET(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await getHandler(request, context))
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
