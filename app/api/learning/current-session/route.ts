import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getLearningCurrentSessionData } from "@/server/modules/learning/service"

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return withNoStoreHeaders(fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401))
    }

    const data = await getLearningCurrentSessionData(auth.userId)

    if (!data) {
      return withNoStoreHeaders(fail("NOT_FOUND", "当前用户还没有可恢复的学习任务。", 404))
    }

    return withNoStoreHeaders(ok(data))
  } catch (error) {
    return withNoStoreHeaders(
      fail(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "加载学习会话失败",
        500,
      ),
    )
  }
}
