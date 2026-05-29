import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createPublicSiteChangelogGetHandler } from "@/server/modules/site-changelog/route-handler"
import { loadPublicSiteChangelogEntry } from "@/server/modules/site-changelog/service"

const getHandler = createPublicSiteChangelogGetHandler({
  loadPublicSiteChangelogEntry,
})

export async function GET(
  request: Request,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await getHandler(request, routeContext))
}
