import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPlanDraftDetailHandler } from "@/server/modules/learning-plans/route-handler"

const handlers = createPlanDraftDetailHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handlers.GET(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handlers.PATCH(request, context)
}
