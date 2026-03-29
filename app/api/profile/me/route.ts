import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getProfileMe } from "@/server/modules/auth/service"

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const data = await getProfileMe(auth.userId)

    if (!data) {
      return fail("NOT_FOUND", "当前用户档案不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载用户档案失败",
      500,
    )
  }
}
