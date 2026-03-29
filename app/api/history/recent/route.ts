import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getDevUserId, getDevUserIdHelpText } from "@/server/lib/dev-session"
import { getRecentHistoryData } from "@/server/modules/history/service"

export async function GET(request: NextRequest) {
  try {
    const userId = getDevUserId(request)

    if (!userId) {
      return fail("AUTH_REQUIRED", getDevUserIdHelpText(), 401)
    }

    const searchParams = request.nextUrl.searchParams
    const page = Number(searchParams.get("page") ?? "1")
    const pageSize = Number(searchParams.get("pageSize") ?? "20")
    const data = await getRecentHistoryData(userId, page, pageSize)

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载学习历史失败",
      500,
    )
  }
}
