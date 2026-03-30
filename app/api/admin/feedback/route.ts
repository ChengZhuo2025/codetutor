import type { NextRequest } from "next/server"
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/api/contracts/feedback"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { getAdminFeedbackList } from "@/server/modules/feedback/service"

function toOptionalEnum<T extends readonly string[]>(value: string | null, options: T) {
  if (!value) {
    return null
  }

  return options.includes(value) ? value : null
}

export async function GET(request: NextRequest) {
  try {
    const admin = getRequestAdmin(request)

    if (!admin.ok) {
      return fail(
        admin.reason === "missing-config" ? "INTERNAL_ERROR" : "FORBIDDEN",
        admin.message,
        admin.reason === "missing-config" ? 500 : 403,
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = toOptionalEnum(
      searchParams.get("status"),
      FEEDBACK_STATUSES,
    ) as FeedbackStatus | null
    const feedbackType = toOptionalEnum(
      searchParams.get("feedbackType"),
      FEEDBACK_TYPES,
    ) as FeedbackType | null
    const keyword = searchParams.get("keyword")?.trim() || undefined
    const userId = searchParams.get("userId")?.trim() || undefined
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50

    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。", 400)
    }

    if (searchParams.get("status") && !status) {
      return fail("VALIDATION_FAILED", "status 参数不合法。", 400)
    }

    if (searchParams.get("feedbackType") && !feedbackType) {
      return fail("VALIDATION_FAILED", "feedbackType 参数不合法。", 400)
    }

    const data = await getAdminFeedbackList({
      status: status ?? undefined,
      feedbackType: feedbackType ?? undefined,
      keyword,
      userId,
      limit,
    })

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载管理员反馈列表失败",
      500,
    )
  }
}
