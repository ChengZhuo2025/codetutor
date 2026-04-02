import type { NextRequest } from "next/server"
import {
  getRequestAuthForAdminProfileHelpText,
  getRequestAuthFromAdminSession,
} from "@/server/lib/request-auth"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createProfileMeGetHandler, createProfileMePatchHandler } from "@/server/modules/auth/route-handler"
import { getProfileMe, updateProfileMe } from "@/server/modules/auth/service"

const getHandler = createProfileMeGetHandler({
  getRequestAuth: (request) => getRequestAuthFromAdminSession(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForAdminProfileHelpText,
  getProfileMe,
})

const patchHandler = createProfileMePatchHandler({
  getRequestAuth: (request) => getRequestAuthFromAdminSession(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForAdminProfileHelpText,
  updateProfileMe,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function PATCH(request: NextRequest) {
  return withNoStoreHeaders(await patchHandler(request))
}
