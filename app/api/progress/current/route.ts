import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getDevUserId, getDevUserIdHelpText } from "@/server/lib/dev-session"
import { getProgressCurrentData } from "@/server/modules/progress/service"

export async function GET(request: NextRequest) {
  try {
    const userId = getDevUserId(request)

    if (!userId) {
      return fail("AUTH_REQUIRED", getDevUserIdHelpText(), 401)
    }

    const data = await getProgressCurrentData(userId)

    if (!data) {
      return fail("NOT_FOUND", "当前用户还没有激活的学习路径。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载当前进度失败",
      500,
    )
  }
}
