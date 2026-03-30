import type { NextRequest } from "next/server"
import type { CompleteTaskRequest } from "@/lib/api/contracts/task"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { completeTask } from "@/server/modules/tasks/service"

function parseRequest(input: unknown): CompleteTaskRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (typeof record.taskId !== "string" || record.taskId.trim().length === 0) {
    return null
  }

  return {
    taskId: record.taskId.trim(),
    conversationId:
      typeof record.conversationId === "string" && record.conversationId.trim().length > 0
        ? record.conversationId.trim()
        : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()
    const input = parseRequest(body)

    if (!input) {
      return fail("VALIDATION_FAILED", "taskId 不合法。", 422)
    }

    const data = await completeTask(auth.userId, input)

    if (!data) {
      return fail("NOT_FOUND", "当前任务不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "完成任务失败"

    if (
      error instanceof Error
      && (
        message.includes("当前学习计划不是进行中状态")
        || message.includes("只能完成当前正在进行的关卡")
        || message.includes("当前任务步骤不存在")
      )
    ) {
      return fail("VALIDATION_FAILED", message, 400)
    }

    return fail("INTERNAL_ERROR", message, 500)
  }
}
