import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSiteInformationGetHandler,
  createAdminSiteInformationPatchHandler,
} from "@/server/modules/admin-site/route-handler"
import {
  loadSiteInformation,
  updateSiteInformation,
} from "@/server/modules/admin-site/service"

const getHandler = createAdminSiteInformationGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteInformation,
})

const patchHandler = createAdminSiteInformationPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteInformation,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function PATCH(request: NextRequest) {
  return withNoStoreHeaders(await patchHandler(request))
}
