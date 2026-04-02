import type { NextRequest } from "next/server"
import {
  getRequestAuthForProfileHelpText,
  getRequestAuthIncludingAdminCookie,
} from "@/server/lib/request-auth"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createProfileMeGetHandler, createProfileMePatchHandler } from "@/server/modules/auth/route-handler"
import { getProfileMe, updateProfileMe } from "@/server/modules/auth/service"

const getHandler = createProfileMeGetHandler({
  getRequestAuth: (request) => getRequestAuthIncludingAdminCookie(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForProfileHelpText,
  getProfileMe,
})

const patchHandler = createProfileMePatchHandler({
  getRequestAuth: (request) => getRequestAuthIncludingAdminCookie(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForProfileHelpText,
  updateProfileMe,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function PATCH(request: NextRequest) {
  return withNoStoreHeaders(await patchHandler(request))
}
