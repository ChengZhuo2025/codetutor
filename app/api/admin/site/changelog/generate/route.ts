import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteChangelogGeneratePostHandler } from "@/server/modules/site-changelog/route-handler"
import { generateSiteChangelogDraft } from "@/server/modules/site-changelog/service"

const postHandler = createAdminSiteChangelogGeneratePostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  generateSiteChangelogDraft,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
