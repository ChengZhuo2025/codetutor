import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createMaterialIntakeStatusGetHandler } from "@/server/modules/learning-plans/route-handler"

const getHandler = createMaterialIntakeStatusGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return getHandler(request, context)
}
