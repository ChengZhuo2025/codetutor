import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSiteHelpCategoryListGetHandler,
  createAdminSiteHelpCategoryPostHandler,
} from "@/server/modules/admin-site/route-handler"
import {
  createSiteHelpCategory,
  loadSiteHelpCategories,
} from "@/server/modules/admin-site/service"

const getHandler = createAdminSiteHelpCategoryListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteHelpCategories,
})

const postHandler = createAdminSiteHelpCategoryPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  createSiteHelpCategory,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
