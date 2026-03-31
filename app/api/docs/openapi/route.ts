import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createOpenApiJsonRouteHandler } from "@/server/modules/api-docs/route-handler"

const getHandler = createOpenApiJsonRouteHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
