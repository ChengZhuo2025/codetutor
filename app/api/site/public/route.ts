import { jsonError } from "@/server/lib/route-response"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createPublicSiteGetHandler } from "@/server/modules/admin-site/route-handler"
import { loadPublicSite } from "@/server/modules/admin-site/service"

const getHandler = createPublicSiteGetHandler({
  loadPublicSite,
})

export async function GET() {
  try {
    return withNoStoreHeaders(await getHandler())
  } catch (error) {
    console.error("Public site route error:", error)
    return jsonError("INTERNAL_ERROR", "站点公开信息读取失败", 500)
  }
}
