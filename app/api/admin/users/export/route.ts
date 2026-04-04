import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminUserExportGetHandler } from "@/server/modules/admin-users/route-handler"
import { getAdminUsersExportCsv } from "@/server/modules/admin-users/service"

const getHandler = createAdminUserExportGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminUsersExportCsv,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
