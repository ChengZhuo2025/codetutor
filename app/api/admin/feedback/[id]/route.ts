import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { getAdminFeedbackDetail } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const admin = getRequestAdmin(request)

    if (!admin.ok) {
      return fail(
        admin.reason === "missing-config" ? "INTERNAL_ERROR" : "FORBIDDEN",
        admin.message,
        admin.reason === "missing-config" ? 500 : 403,
      )
    }

    const { id } = await context.params

    if (!id) {
      return fail("BAD_REQUEST", "反馈单 ID 不合法。", 400)
    }

    const data = await getAdminFeedbackDetail(id)

    if (!data) {
      return fail("NOT_FOUND", "反馈单不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载管理员反馈详情失败",
      500,
    )
  }
}
