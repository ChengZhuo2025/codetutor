import type { NextRequest } from "next/server"
import {
  getRequestAuthForProfileHelpText,
  getRequestAuthIncludingAdminCookie,
} from "@/server/lib/request-auth"
import { createProfileAvatarPostHandler } from "@/server/modules/auth/route-handler"
import { uploadProfileAvatar } from "@/server/modules/auth/service"

const postHandler = createProfileAvatarPostHandler({
  getRequestAuth: (request) => getRequestAuthIncludingAdminCookie(request as NextRequest),
  getRequestAuthHelpText: getRequestAuthForProfileHelpText,
  uploadProfileAvatar,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
