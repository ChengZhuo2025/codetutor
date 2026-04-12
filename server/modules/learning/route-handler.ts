import type {
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningCurrentSessionResponseData,
} from "../../../lib/api/contracts/learning.ts"
import { jsonInternalErrorFromError } from "../../lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import { withNoStoreHeaders } from "../../lib/response-cache.ts"
import { parseLearningMessagesQuery } from "../../lib/request-validation.ts"
import { executeLearningMessageRequest } from "./http-logic.ts"

type RequestLike = {
  headers: Pick<Headers, "get">
  json: () => Promise<unknown>
}

type GetRequestLike = {
  url: string
}

type SendLearningMessage = (
  userId: string,
  request: LearningMessageRequest,
) => Promise<LearningMessageResponseData | null>

type StreamLearningMessage = (
  userId: string,
  request: LearningMessageRequest,
) => Promise<ReadableStream<Uint8Array> | null>

export type LearningMessagePostRouteDependencies = {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  executeLearningMessageRequest: typeof executeLearningMessageRequest
  sendLearningMessage: SendLearningMessage
  streamLearningMessage: StreamLearningMessage
}

export function createLearningMessagePostHandler(
  dependencies: LearningMessagePostRouteDependencies,
) {
  return async function POST(request: RequestLike) {
    const auth = await dependencies.getRequestAuth(request)

    if (!auth) {
      return jsonAuthRequired(dependencies.getRequestAuthHelpText())
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError("VALIDATION_FAILED", "请求体不是合法 JSON。", 422)
    }

    const result = await dependencies.executeLearningMessageRequest({
      userId: auth.userId,
      acceptHeader: request.headers.get("accept"),
      body,
      sendMessage: dependencies.sendLearningMessage,
      streamMessage: dependencies.streamLearningMessage,
    })

    if (result.kind === "sse") {
      return new Response(result.stream, {
        status: result.status,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    return Response.json(result.body, {
      status: result.status,
    })
  }
}

export function createLearningMessagesGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getLearningMessagesPage: (
    userId: string,
    input: {
      conversationId: string
      beforeSequenceNo: number | null
      limit?: number
    },
  ) => Promise<LearningMessagesResponseData | null>
}) {
  return async function GET(request: GetRequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseLearningMessagesQuery(new URL(request.url).searchParams)

      if (!input.ok) {
        return jsonError(input.code, input.message, 422)
      }

      const data = await dependencies.getLearningMessagesPage(auth.userId, {
        conversationId: input.data.conversationId,
        beforeSequenceNo: input.data.beforeSequenceNo,
        limit: input.data.limit,
      })

      if (!data) {
        return jsonError("NOT_FOUND", "当前会话不存在。", 404)
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载历史消息失败")
    }
  }
}

function readOptionalQueryParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)

  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function createLearningCurrentSessionGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getLearningCurrentSessionData: (
    userId: string,
    input?: {
      sessionId?: string | null
      taskId?: string | null
    },
  ) => Promise<LearningCurrentSessionResponseData | null>
}) {
  return async function GET(request: GetRequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return withNoStoreHeaders(jsonAuthRequired(dependencies.getRequestAuthHelpText()))
      }

      const searchParams = new URL(request.url).searchParams
      const data = await dependencies.getLearningCurrentSessionData(auth.userId, {
        sessionId: readOptionalQueryParam(searchParams, "sessionId"),
        taskId: readOptionalQueryParam(searchParams, "taskId"),
      })

      if (!data) {
        return withNoStoreHeaders(jsonError("NOT_FOUND", "当前用户还没有可恢复的学习任务。", 404))
      }

      return withNoStoreHeaders(jsonSuccess(data))
    } catch (error) {
      return withNoStoreHeaders(
        jsonError(
          "INTERNAL_ERROR",
          error instanceof Error ? error.message : "加载学习会话失败",
          500,
        ),
      )
    }
  }
}
