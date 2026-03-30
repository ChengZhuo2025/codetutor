import type {
  LearningInteractionType,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningTaskPatch,
} from "../../../lib/api/contracts/learning.ts"
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../../../lib/api/types.ts"
import {
  classifyLearningRouteError,
  resolveLearningResponseMode,
} from "./logic.ts"

type ExecuteLearningMessageRequestInput = {
  userId: string
  acceptHeader: string | null
  body: unknown
  sendMessage: (
    userId: string,
    request: LearningMessageRequest,
  ) => Promise<LearningMessageResponseData | null>
  streamMessage: (
    userId: string,
    request: LearningMessageRequest,
  ) => Promise<ReadableStream<Uint8Array> | null>
}

type LearningJsonExecutionResult = {
  kind: "json"
  status: number
  body: ApiSuccessResponse<LearningMessageResponseData> | ApiErrorResponse
}

type LearningSSEExecutionResult = {
  kind: "sse"
  status: number
  stream: ReadableStream<Uint8Array>
}

export type ExecuteLearningMessageRequestResult =
  | LearningJsonExecutionResult
  | LearningSSEExecutionResult

type SSEReplayEvent = {
  event: string
  data: Record<string, unknown>
}

export function isValidLearningMessageRequestBody(
  value: unknown,
): value is LearningMessageRequest {
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

export async function executeLearningMessageRequest(
  input: ExecuteLearningMessageRequestInput,
): Promise<ExecuteLearningMessageRequestResult> {
  if (!isValidLearningMessageRequestBody(input.body)) {
    return {
      kind: "json",
      status: 422,
      body: {
        code: "VALIDATION_FAILED",
        message: "inputType 或 content 不合法。",
        data: null,
      },
    }
  }

  try {
    if (resolveLearningResponseMode(input.acceptHeader, input.body.stream) === "sse") {
      const stream = await input.streamMessage(input.userId, input.body)

      if (!stream) {
        return {
          kind: "json",
          status: 404,
          body: {
            code: "NOT_FOUND",
            message: "当前用户还没有可用的学习会话。",
            data: null,
          },
        }
      }

      return {
        kind: "sse",
        status: 200,
        stream,
      }
    }

    const data = await input.sendMessage(input.userId, input.body)

    if (!data) {
      return {
        kind: "json",
        status: 404,
        body: {
          code: "NOT_FOUND",
          message: "当前用户还没有可用的学习会话。",
          data: null,
        },
      }
    }

    return {
      kind: "json",
      status: 200,
      body: {
        code: "OK",
        message: "success",
        data,
      },
    }
  } catch (error) {
    const result = classifyLearningRouteError(error)
    return {
      kind: "json",
      status: result.status,
      body: {
        code: result.code,
        message: result.message,
        data: null,
      },
    }
  }
}

export function buildIdempotentReplaySSEEvents(input: {
  conversationId: string
  interactionType: LearningInteractionType
  agentCode: string
  modelCode: string
  providerCode: string
  messageContent: string
  taskPatch?: LearningTaskPatch | null
}): SSEReplayEvent[] {
  const events: SSEReplayEvent[] = [
    {
      event: "session_started",
      data: {
        conversationId: input.conversationId,
        interactionType: input.interactionType,
        agentCode: input.agentCode,
        modelCode: input.modelCode,
        providerCode: input.providerCode,
      },
    },
  ]

  if (input.taskPatch) {
    events.push({
      event: "task_patch",
      data: input.taskPatch,
    })
  }

  events.push(
    {
      event: "assistant_delta",
      data: {
        delta: input.messageContent,
      },
    },
    {
      event: "assistant_done",
      data: {
        finishReason: "idempotent_replay",
        usage: null,
      },
    },
  )

  return events
}
