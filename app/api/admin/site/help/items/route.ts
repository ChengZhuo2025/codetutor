import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSiteHelpItemListGetHandler,
  createAdminSiteHelpItemPostHandler,
} from "@/server/modules/admin-site/route-handler"
import {
  createSiteHelpItem,
  loadSiteHelpItems,
} from "@/server/modules/admin-site/service"

const getHandler = createAdminSiteHelpItemListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteHelpItems,
})

const postHandler = createAdminSiteHelpItemPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  createSiteHelpItem,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
