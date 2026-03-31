import {
  jsonCurrentTaskNotFound,
} from "../../lib/route-error-presets.ts"
import {
  mapRouteError,
} from "../../lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import { parseCompleteTaskBody, parseUpdateTaskStatusBody } from "../../lib/request-validation.ts"

type RequestLike = {
  json: () => Promise<unknown>
}

type CompleteTask = (
  userId: string,
  input: {
    taskId: string
    conversationId?: string | null
  },
) => Promise<unknown>

type UpdateTaskStatus = (
  userId: string,
  input: {
    taskId: string
    status: "in_progress" | "blocked"
    reason?: string | null
  },
) => Promise<unknown>

export function createCompleteTaskPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  completeTask: CompleteTask
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseCompleteTaskBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 422)
      }

      const data = await dependencies.completeTask(auth.userId, input.data)

      if (!data) {
        return jsonCurrentTaskNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return mapRouteError(error, "完成任务失败", [
        {
          code: "VALIDATION_FAILED",
          status: 400,
          messageIncludes: [
            "当前学习计划不是进行中状态",
            "只能完成当前正在进行的关卡",
            "当前任务步骤不存在",
          ],
        },
      ])
    }
  }
}

export function createUpdateTaskStatusPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  updateTaskStatus: UpdateTaskStatus
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseUpdateTaskStatusBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 422)
      }

      const data = await dependencies.updateTaskStatus(auth.userId, input.data)

      if (!data) {
        return jsonCurrentTaskNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return mapRouteError(error, "更新任务状态失败", [
        {
          code: "VALIDATION_FAILED",
          status: 400,
          messageIncludes: [
            "当前学习计划不是进行中状态",
            "只能更新当前正在进行的关卡状态",
          ],
        },
      ])
    }
  }
}
