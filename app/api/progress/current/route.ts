import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getProgressCurrentData } from "@/server/modules/progress/service"

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const data = await getProgressCurrentData(auth.userId)

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
