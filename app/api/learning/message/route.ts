import type { NextRequest } from "next/server"
import type { LearningMessageRequest } from "@/lib/api/contracts/learning"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import {
  LearningAIProviderError,
  LearningValidationError,
} from "@/server/modules/learning/errors"
import {
  sendLearningMessage,
} from "@/server/modules/learning/service"
import { streamLearningMessage } from "@/server/modules/learning/orchestration"

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

    const prefersStream =
      body.stream === true
      || request.headers.get("accept")?.includes("text/event-stream")

    if (prefersStream) {
      const stream = await streamLearningMessage(auth.userId, body)

      if (!stream) {
        return fail("NOT_FOUND", "当前用户还没有可用的学习会话。", 404)
      }

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    const data = await sendLearningMessage(auth.userId, body)

    if (!data) {
      return fail("NOT_FOUND", "当前用户还没有可用的学习会话。", 404)
    }

    return ok(data)
  } catch (error) {
    if (error instanceof LearningValidationError) {
      return fail("VALIDATION_FAILED", error.message, 422)
    }

    if (error instanceof LearningAIProviderError) {
      return fail("AI_PROVIDER_ERROR", error.message, 502)
    }

    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "发送学习消息失败",
      500,
    )
  }
}
