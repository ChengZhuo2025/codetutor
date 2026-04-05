import type { NextRequest } from "next/server"
import {
  getRequestAuthForAdminProfileHelpText,
  getRequestAuthFromAdminSession,
} from "@/server/lib/request-auth"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createProfileAvatarPostHandler } from "@/server/modules/auth/route-handler"
import { uploadAdminProfileAvatar } from "@/server/modules/auth/service"

const postHandler = createProfileAvatarPostHandler({
  getRequestAuth: (request) => getRequestAuthFromAdminSession(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForAdminProfileHelpText,
  uploadProfileAvatar: uploadAdminProfileAvatar,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
