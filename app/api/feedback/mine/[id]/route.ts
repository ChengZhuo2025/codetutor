import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getMyFeedbackDetail } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const { id } = await context.params

    if (!id) {
      return fail("BAD_REQUEST", "反馈单 ID 不合法。", 400)
    }

    const data = await getMyFeedbackDetail(auth.userId, id)

    if (!data) {
      return fail("NOT_FOUND", "反馈记录不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载反馈详情失败",
      500,
    )
  }
}
