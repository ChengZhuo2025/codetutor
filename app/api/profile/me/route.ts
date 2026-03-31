import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createProfileMeGetHandler, createProfileMePatchHandler } from "@/server/modules/auth/route-handler"
import { getProfileMe, updateProfileMe } from "@/server/modules/auth/service"

const getHandler = createProfileMeGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getProfileMe,
})

const patchHandler = createProfileMePatchHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  updateProfileMe,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}

export async function PATCH(request: NextRequest) {
  return patchHandler(request)
}
