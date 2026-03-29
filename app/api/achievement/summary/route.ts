import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getAchievementSummaryData } from "@/server/modules/achievement/service"

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const data = await getAchievementSummaryData(auth.userId)

    if (!data) {
      return fail("NOT_FOUND", "当前用户还没有成长数据。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载成就数据失败",
      500,
    )
  }
}
