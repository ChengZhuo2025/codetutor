import type { NextRequest } from "next/server"
import type { UpdateLearningHistoryStatusRequest } from "@/lib/api/contracts/history"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { updateHistoryPlanStatus } from "@/server/modules/history/service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function parseUpdateRequest(input: unknown): UpdateLearningHistoryStatusRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (
    record.action !== "abandon"
    && record.action !== "reactivate"
    && record.action !== "archive"
  ) {
    return null
  }

  return {
    action: record.action,
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const { id } = await context.params

    if (!id) {
      return fail("BAD_REQUEST", "学习计划 ID 不合法。", 400)
    }

    const body = await request.json()
    const input = parseUpdateRequest(body)

    if (!input) {
      return fail("BAD_REQUEST", "学习计划操作请求体不合法。", 400)
    }

    const data = await updateHistoryPlanStatus(auth.userId, id, input.action)

    if (!data) {
      return fail("NOT_FOUND", "学习计划不存在。", 404)
    }

    return ok(data, "history plan updated")
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新学习计划状态失败"

    if (error instanceof Error && error.name === "CONFLICT") {
      return fail("CONFLICT", message, 409)
    }

    if (
      error instanceof Error
      && (
        message.includes("只有")
        || message.includes("不能直接删除")
        || message.includes("当前已有进行中的学习计划")
      )
    ) {
      return fail("VALIDATION_FAILED", message, 400)
    }

    return fail("INTERNAL_ERROR", message, 500)
  }
}
