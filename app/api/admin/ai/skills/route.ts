import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createAdminAISkillListGetHandler } from "@/server/modules/admin-ai/route-handler"
import { getAdminAISkillList } from "@/server/modules/admin-ai/service"

const getHandler = createAdminAISkillListGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAISkillList,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}
