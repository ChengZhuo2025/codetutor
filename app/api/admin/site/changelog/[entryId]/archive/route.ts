import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteChangelogArchivePostHandler } from "@/server/modules/site-changelog/route-handler"
import { archiveSiteChangelogEntry } from "@/server/modules/site-changelog/service"

const postHandler = createAdminSiteChangelogArchivePostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  archiveSiteChangelogEntry,
})

export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await postHandler(request, routeContext))
}
