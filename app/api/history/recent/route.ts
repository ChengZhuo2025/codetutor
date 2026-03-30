import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getRecentHistoryData } from "@/server/modules/history/service"

function normalizeHistoryFilter(input: string | null) {
  if (
    input === "all"
    || input === "in_progress"
    || input === "interrupted"
    || input === "completed"
    || input === "abandoned"
  ) {
    return input
  }

  return "all"
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const searchParams = request.nextUrl.searchParams
    const page = Number(searchParams.get("page") ?? "1")
    const pageSize = Number(searchParams.get("pageSize") ?? "20")
    const filter = normalizeHistoryFilter(searchParams.get("status"))
    const data = await getRecentHistoryData(auth.userId, page, pageSize, filter)

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载学习历史失败",
      500,
    )
  }
}
