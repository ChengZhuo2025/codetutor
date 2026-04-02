import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPlanDraftConfirmPostHandler } from "@/server/modules/learning-plans/route-handler"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const postHandler = createPlanDraftConfirmPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function POST(request: NextRequest, context: RouteContext) {
  return postHandler(request, context)
}
