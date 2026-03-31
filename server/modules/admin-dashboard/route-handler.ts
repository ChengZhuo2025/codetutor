// 管理员看板路由处理器
import type { NextRequest } from "next/server"

import { ok, fail } from "@/server/lib/api-response"
import { adminDashboardOverviewResponseDataSchema } from "@/server/modules/api-docs/schemas"
import { getDashboardOverview } from "./service"

/**
 * GET /api/admin/dashboard/overview
 * 获取总览看板数据
 */
export async function GET_overview(req: NextRequest) {
  try {
    const data = await getDashboardOverview()
    return ok(data, "获取看板数据成功")
  } catch {
    return fail("INTERNAL_ERROR", "获取看板数据失败", 500)
  }
}
