import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminDashboardOverviewGetHandler } from "@/server/modules/admin-dashboard/route-handler"
import { getDashboardOverview } from "@/server/modules/admin-dashboard/service"

const getHandler = createAdminDashboardOverviewGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getDashboardOverview: (adminAccountId) => getDashboardOverview(adminAccountId),
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
