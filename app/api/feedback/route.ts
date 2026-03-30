import type { NextRequest } from "next/server"
import {
  FEEDBACK_SOURCES,
  FEEDBACK_TYPES,
  type CreateFeedbackRequest,
} from "@/lib/api/contracts/feedback"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createFeedbackTicket } from "@/server/modules/feedback/service"

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseCreateFeedbackRequest(input: unknown): CreateFeedbackRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (
    typeof record.feedbackType !== "string"
    || typeof record.title !== "string"
    || typeof record.content !== "string"
  ) {
    return null
  }

  if (!FEEDBACK_TYPES.includes(record.feedbackType as (typeof FEEDBACK_TYPES)[number])) {
    return null
  }

  if (
    record.source != null
    && (
      typeof record.source !== "string"
      || !FEEDBACK_SOURCES.includes(record.source as (typeof FEEDBACK_SOURCES)[number])
    )
  ) {
    return null
  }

  return {
    feedbackType: record.feedbackType as (typeof FEEDBACK_TYPES)[number],
    title: record.title,
    content: record.content,
    contactMethod: normalizeOptionalString(record.contactMethod),
    source:
      typeof record.source === "string"
        ? (record.source as (typeof FEEDBACK_SOURCES)[number])
        : null,
  }
}

function validateCreateFeedbackRequest(input: CreateFeedbackRequest) {
  if (input.title.trim().length < 4) {
    return "标题至少需要 4 个字符。"
  }

  if (input.title.trim().length > 80) {
    return "标题最多 80 个字符。"
  }

  if (input.content.trim().length < 10) {
    return "反馈内容至少需要 10 个字符。"
  }

  if (input.content.trim().length > 2000) {
    return "反馈内容最多 2000 个字符。"
  }

  if (input.contactMethod && input.contactMethod.trim().length > 120) {
    return "回访联系方式最多 120 个字符。"
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()
    const input = parseCreateFeedbackRequest(body)

    if (!input) {
      return fail("BAD_REQUEST", "反馈请求体不合法。", 400)
    }

    const validationError = validateCreateFeedbackRequest(input)

    if (validationError) {
      return fail("VALIDATION_FAILED", validationError, 400)
    }

    const data = await createFeedbackTicket(auth.userId, input)
    return ok(data, "feedback created")
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "提交反馈失败",
      500,
    )
  }
}
