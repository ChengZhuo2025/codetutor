import type { NextRequest } from "next/server"
import type { LearningMessageRequest } from "@/lib/api/contracts/learning"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { sendLearningMessage } from "@/server/modules/learning/service"

function isValidBody(value: unknown): value is LearningMessageRequest {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.inputType === "string" &&
    ["text", "link", "code"].includes(record.inputType) &&
    typeof record.content === "string" &&
    record.content.trim().length > 0
  )
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()

    if (!isValidBody(body)) {
      return fail("VALIDATION_FAILED", "inputType 或 content 不合法。", 422)
    }

    const data = await sendLearningMessage(auth.userId, body)

    if (!data) {
      return fail("NOT_FOUND", "当前用户还没有可用的学习会话。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "发送学习消息失败",
      500,
    )
  }
}
