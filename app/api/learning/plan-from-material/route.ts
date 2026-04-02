import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createPlanFromMaterialPostHandler } from "@/server/modules/learning-plans/route-handler"

const postHandler = createPlanFromMaterialPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
