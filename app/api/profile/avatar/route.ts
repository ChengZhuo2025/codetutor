import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createProfileAvatarPostHandler } from "@/server/modules/auth/route-handler"
import { uploadProfileAvatar } from "@/server/modules/auth/service"

const postHandler = createProfileAvatarPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  uploadProfileAvatar,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
