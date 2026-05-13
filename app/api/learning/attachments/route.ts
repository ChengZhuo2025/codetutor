import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { withRequestObservability } from "@/server/lib/observability"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createLearningMessageAttachment } from "@/server/modules/learning/attachments"
import { createLearningAttachmentPostHandler } from "@/server/modules/learning/route-handler"

const postHandler = createLearningAttachmentPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  createLearningMessageAttachment,
})

export async function POST(request: NextRequest) {
  return withRequestObservability(
    {
      route: "/api/learning/attachments",
      feature: "learning",
      method: "POST",
    },
    async () => withNoStoreHeaders(await postHandler(request)),
  )
}
