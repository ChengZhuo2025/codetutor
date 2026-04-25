import { jsonSuccess, jsonError } from "@/server/lib/route-response"
import { loadSiteContactSettings } from "@/server/modules/admin-settings/service"

/**
 * Public endpoint for marketing contact dialog to fetch dynamic enterprise contact info.
 * No auth required, respects RLS policy for SELECT.
 */
export async function GET() {
  try {
    const data = await loadSiteContactSettings()
    return jsonSuccess(data, "联系方式读取成功")
  } catch (error) {
    console.error("Public contact GET error:", error)
    return jsonError("INTERNAL_ERROR", "联系方式读取失败", 500)
  }
}
