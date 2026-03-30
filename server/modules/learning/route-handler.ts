import type {
  LearningMessageRequest,
  LearningMessageResponseData,
} from "../../../lib/api/contracts/learning.ts"
import { executeLearningMessageRequest } from "./http-logic.ts"

type RequestLike = {
  headers: Pick<Headers, "get">
  json: () => Promise<unknown>
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
      return Response.json(
        {
          code: "AUTH_REQUIRED",
          message: dependencies.getRequestAuthHelpText(),
          data: null,
        },
        { status: 401 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        {
          code: "VALIDATION_FAILED",
          message: "请求体不是合法 JSON。",
          data: null,
        },
        { status: 422 },
      )
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
