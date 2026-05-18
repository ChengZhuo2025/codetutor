import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteArticleListGetHandler } from "@/server/modules/admin-site/route-handler"
import { loadSiteArticleList } from "@/server/modules/admin-site/service"

const getHandler = createAdminSiteArticleListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteArticleList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
