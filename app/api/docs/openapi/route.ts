import type { NextRequest } from "next/server"
import {
  getRequestAuthForProfileHelpText,
  getRequestAuthIncludingAdminCookie,
} from "@/server/lib/request-auth"
import { createOpenApiJsonRouteHandler } from "@/server/modules/api-docs/route-handler"

const getHandler = createOpenApiJsonRouteHandler({
  getRequestAuth: (request) => getRequestAuthIncludingAdminCookie(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForProfileHelpText,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
