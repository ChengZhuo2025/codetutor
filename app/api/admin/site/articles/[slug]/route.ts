import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSiteArticleGetHandler,
  createAdminSiteArticlePatchHandler,
} from "@/server/modules/admin-site/route-handler"
import {
  loadSiteArticle,
  updateSiteArticle,
} from "@/server/modules/admin-site/service"

const getHandler = createAdminSiteArticleGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteArticle,
})

const patchHandler = createAdminSiteArticlePatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteArticle,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  return withNoStoreHeaders(await getHandler(request, context))
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, context))
}
