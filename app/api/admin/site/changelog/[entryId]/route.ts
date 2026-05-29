import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminSiteChangelogDeleteHandler,
  createAdminSiteChangelogGetHandler,
  createAdminSiteChangelogPatchHandler,
} from "@/server/modules/site-changelog/route-handler"
import {
  deleteSiteChangelogEntry,
  loadAdminSiteChangelogEntry,
  updateSiteChangelogEntry,
} from "@/server/modules/site-changelog/service"

const getHandler = createAdminSiteChangelogGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  loadAdminSiteChangelogEntry,
})

const patchHandler = createAdminSiteChangelogPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateSiteChangelogEntry,
})

const deleteHandler = createAdminSiteChangelogDeleteHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  deleteSiteChangelogEntry,
})

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await getHandler(request, routeContext))
}

export async function PATCH(
  request: NextRequest,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await patchHandler(request, routeContext))
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ entryId: string }> },
) {
  return withNoStoreHeaders(await deleteHandler(request, routeContext))
}
