import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteChangelogPublishPostHandler } from "@/server/modules/site-changelog/route-handler"
import { publishSiteChangelogEntry } from "@/server/modules/site-changelog/service"

const postHandler = createAdminSiteChangelogPublishPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  publishSiteChangelogEntry,
})

export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await postHandler(request, routeContext))
}
