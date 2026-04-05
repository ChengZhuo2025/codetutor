import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createNotificationReadPostHandler } from "@/server/modules/notifications/route-handler"
import { markNotificationRead } from "@/server/modules/notifications/service"

const postHandler = createNotificationReadPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  markNotificationRead,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id?: string }> },
) {
  return postHandler(request, context)
}
