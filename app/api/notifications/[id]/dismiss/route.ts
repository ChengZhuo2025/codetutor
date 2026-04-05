import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createNotificationDismissPostHandler } from "@/server/modules/notifications/route-handler"
import { dismissNotification } from "@/server/modules/notifications/service"

const postHandler = createNotificationDismissPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  dismissNotification,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id?: string }> },
) {
  return postHandler(request, context)
}
