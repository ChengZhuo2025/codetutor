import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createPublicSiteChangelogListGetHandler } from "@/server/modules/site-changelog/route-handler"
import { loadPublicSiteChangelogEntries } from "@/server/modules/site-changelog/service"

const getHandler = createPublicSiteChangelogListGetHandler({
  loadPublicSiteChangelogEntries,
})

export async function GET(request: Request) {
  return withNoStoreHeaders(await getHandler(request))
}
