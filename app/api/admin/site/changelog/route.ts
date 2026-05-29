import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteChangelogListGetHandler } from "@/server/modules/site-changelog/route-handler"
import { loadAdminSiteChangelogEntries } from "@/server/modules/site-changelog/service"

const getHandler = createAdminSiteChangelogListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadAdminSiteChangelogEntries,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
