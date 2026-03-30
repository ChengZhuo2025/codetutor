import type { NextRequest } from "next/server"
import type { UpdateTaskStatusRequest } from "@/lib/api/contracts/task"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { updateTaskStatus } from "@/server/modules/tasks/service"

function parseRequest(input: unknown): UpdateTaskStatusRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (
    typeof record.taskId !== "string"
    || record.taskId.trim().length === 0
    || (record.status !== "in_progress" && record.status !== "blocked")
  ) {
    return null
  }

  return {
    taskId: record.taskId.trim(),
    status: record.status,
    reason:
      typeof record.reason === "string" && record.reason.trim().length > 0
        ? record.reason.trim()
        : null,
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
      return fail("VALIDATION_FAILED", "taskId 或 status 不合法。", 422)
    }

    const data = await updateTaskStatus(auth.userId, input)

    if (!data) {
      return fail("NOT_FOUND", "当前任务不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新任务状态失败"

    if (
      error instanceof Error
      && (
        message.includes("当前学习计划不是进行中状态")
        || message.includes("只能更新当前正在进行的关卡状态")
      )
    ) {
      return fail("VALIDATION_FAILED", message, 400)
    }

    return fail("INTERNAL_ERROR", message, 500)
  }
}
