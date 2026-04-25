import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSettingsContactGetHandler,
  createAdminSettingsContactPatchHandler,
} from "@/server/modules/admin-settings/route-handler"
import {
  loadSiteContactSettings,
  updateSiteContactSettings,
} from "@/server/modules/admin-settings/service"

const getHandler = createAdminSettingsContactGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadSiteContactSettings,
})

const patchHandler = createAdminSettingsContactPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteContactSettings,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function PATCH(request: NextRequest) {
  return await patchHandler(request)
}
