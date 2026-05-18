import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminSiteLogoUploadPostHandler } from "@/server/modules/admin-site/route-handler"
import { uploadSiteLogo } from "@/server/modules/admin-site/service"

const postHandler = createAdminSiteLogoUploadPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  uploadSiteLogo,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
