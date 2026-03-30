import type { NextRequest } from "next/server"
import {
  FEEDBACK_STATUSES,
  type AdminUpdateFeedbackStatusRequest,
} from "@/lib/api/contracts/feedback"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { adminUpdateFeedbackStatus } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function parseRequest(input: unknown): AdminUpdateFeedbackStatusRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (
    typeof record.status !== "string"
    || !FEEDBACK_STATUSES.includes(record.status as (typeof FEEDBACK_STATUSES)[number])
  ) {
    return null
  }

  return {
    status: record.status as (typeof FEEDBACK_STATUSES)[number],
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const body = await request.json()
    const input = parseRequest(body)

    if (!id || !input) {
      return fail("BAD_REQUEST", "管理员状态更新请求体不合法。", 400)
    }

    const data = await adminUpdateFeedbackStatus(id, input)

    if (!data) {
      return fail("NOT_FOUND", "反馈单不存在。", 404)
    }

    return ok(data, "feedback status updated")
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "管理员更新反馈状态失败",
      500,
    )
  }
}
