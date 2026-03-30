import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { normalizeUuid } from "@/server/lib/identifiers"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getLearningMessagesPage } from "@/server/modules/learning/service"

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const conversationId = normalizeUuid(
      request.nextUrl.searchParams.get("conversationId"),
    )

    if (!conversationId) {
      return fail("VALIDATION_FAILED", "conversationId 不合法。", 422)
    }

    const rawBeforeSequenceNo = request.nextUrl.searchParams.get("beforeSequenceNo")
    const rawLimit = request.nextUrl.searchParams.get("limit")
    const parsedBeforeSequenceNo =
      rawBeforeSequenceNo === null ? null : parsePositiveInteger(rawBeforeSequenceNo)
    const parsedLimit =
      rawLimit === null ? null : parsePositiveInteger(rawLimit)

    if (rawBeforeSequenceNo !== null && parsedBeforeSequenceNo === null) {
      return fail("VALIDATION_FAILED", "beforeSequenceNo 必须是正整数。", 422)
    }

    if (rawLimit !== null && parsedLimit === null) {
      return fail("VALIDATION_FAILED", "limit 必须是正整数。", 422)
    }

    const data = await getLearningMessagesPage(auth.userId, {
      conversationId,
      beforeSequenceNo: parsedBeforeSequenceNo,
      limit: parsedLimit ?? undefined,
    })

    if (!data) {
      return fail("NOT_FOUND", "当前会话不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载历史消息失败",
      500,
    )
  }
}
