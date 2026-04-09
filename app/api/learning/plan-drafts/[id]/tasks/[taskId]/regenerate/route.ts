import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPlanDraftTaskRegeneratePostHandler } from "@/server/modules/learning-plans/route-handler"

const postHandler = createPlanDraftTaskRegeneratePostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> },
) {
  return postHandler(request, context)
}
