import type {
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningMessagesResponseData,
} from "../../../lib/api/contracts/learning.ts"
import { jsonInternalErrorFromError } from "../../lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
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
