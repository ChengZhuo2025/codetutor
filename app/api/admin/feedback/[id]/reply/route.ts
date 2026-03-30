import type { NextRequest } from "next/server"
import {
  FEEDBACK_STATUSES,
  type AdminReplyFeedbackRequest,
} from "@/lib/api/contracts/feedback"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { adminReplyFeedback } from "@/server/modules/feedback/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function parseRequest(input: unknown): AdminReplyFeedbackRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (typeof record.content !== "string") {
    return null
  }

  if (
    record.status != null
    && (
      typeof record.status !== "string"
      || !FEEDBACK_STATUSES.includes(record.status as (typeof FEEDBACK_STATUSES)[number])
    )
  ) {
    return null
  }

  return {
    content: record.content,
    status:
      typeof record.status === "string"
        ? (record.status as (typeof FEEDBACK_STATUSES)[number])
        : undefined,
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
      return fail("BAD_REQUEST", "管理员回复请求体不合法。", 400)
    }

    if (input.content.trim().length < 2) {
      return fail("VALIDATION_FAILED", "回复内容至少需要 2 个字符。", 400)
    }

    if (input.content.trim().length > 2000) {
      return fail("VALIDATION_FAILED", "回复内容最多 2000 个字符。", 400)
    }

    const data = await adminReplyFeedback(id, input, admin.adminId)

    if (!data) {
      return fail("NOT_FOUND", "反馈单不存在。", 404)
    }

    return ok(data, "feedback replied")
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "管理员回复反馈失败",
      500,
    )
  }
}
