import type {
  LearningAttachmentCreateResponseData,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningCurrentSessionResponseData,
  LearningMessageAttachmentKind,
  LearningMessageSpeechRequest,
} from "../../../lib/api/contracts/learning.ts"
import { jsonInternalErrorFromError } from "../../lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "../../lib/route-response.ts"
import { withNoStoreHeaders } from "../../lib/response-cache.ts"
import {
  parseLearningAttachmentFile,
  parseLearningAttachmentKind,
  parseLearningMessagesQuery,
  parseOptionalNonnegativeInteger,
  parseOptionalPositiveInteger,
} from "../../lib/request-validation.ts"
import { executeLearningMessageRequest } from "./http-logic.ts"
import {
  LearningAIProviderError,
  LearningConfigurationError,
  LearningValidationError,
} from "./errors.ts"
import type { LearningMessageSpeechResult } from "./speech.ts"

type RequestLike = {
  headers: Pick<Headers, "get">
  json: () => Promise<unknown>
}

type GetRequestLike = {
  url: string
}

type FormRequestLike = {
  formData: () => Promise<FormData>
}

type SendLearningMessage = (
  userId: string,
  request: LearningMessageRequest,
) => Promise<LearningMessageResponseData | null>

type StreamLearningMessage = (
  userId: string,
  request: LearningMessageRequest,
) => Promise<ReadableStream<Uint8Array> | null>

type SynthesizeLearningMessageSpeech = (
  userId: string,
  input: LearningMessageSpeechRequest,
) => Promise<LearningMessageSpeechResult | null>

export type LearningMessagePostRouteDependencies = {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  executeLearningMessageRequest: typeof executeLearningMessageRequest
  sendLearningMessage: SendLearningMessage
  streamLearningMessage: StreamLearningMessage
}

function parseLearningMessageSpeechBody(body: unknown): LearningMessageSpeechRequest | null {
  if (!body || typeof body !== "object") {
    return null
  }

  const record = body as Record<string, unknown>
  const messageId = record.messageId
  if (
    (typeof messageId !== "string" && typeof messageId !== "number")
    || String(messageId).trim().length === 0
  ) {
    return null
  }

  if (
    record.text !== undefined
    && record.text !== null
    && typeof record.text !== "string"
  ) {
    return null
  }

  return {
    messageId: String(messageId).trim(),
    text: typeof record.text === "string" ? record.text : undefined,
  }
}

export function createLearningAttachmentPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  createLearningMessageAttachment: (
    userId: string,
    input: {
      kind: LearningMessageAttachmentKind
      file: File
      sessionId?: string | null
      durationMs?: number | null
      width?: number | null
      height?: number | null
    },
  ) => Promise<LearningAttachmentCreateResponseData>
}) {
  return async function POST(request: FormRequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const formData = await request.formData()
      const kind = parseLearningAttachmentKind(formData.get("kind"))

      if (!kind.ok) {
        return jsonError(kind.code, kind.message, 422)
      }

      const durationMs = parseOptionalNonnegativeInteger(formData.get("durationMs"), "durationMs")
      if (!durationMs.ok) {
        return jsonError(durationMs.code, durationMs.message, 422)
      }

      const width = parseOptionalPositiveInteger(formData.get("width"), "width")
      if (!width.ok) {
        return jsonError(width.code, width.message, 422)
      }

      const height = parseOptionalPositiveInteger(formData.get("height"), "height")
      if (!height.ok) {
        return jsonError(height.code, height.message, 422)
      }

      const file = parseLearningAttachmentFile(formData.get("file"), kind.data, durationMs.data)

      if (!file.ok) {
        return jsonError(file.code, file.message, file.code === "BAD_REQUEST" ? 400 : 422)
      }

      const sessionId = formData.get("sessionId")
      const data = await dependencies.createLearningMessageAttachment(auth.userId, {
        kind: kind.data,
        file: file.data,
        sessionId: typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId.trim() : null,
        durationMs: durationMs.data,
        width: width.data,
        height: height.data,
      })

      return jsonSuccess(data, "attachment uploaded")
    } catch (error) {
      return jsonInternalErrorFromError(error, "附件上传失败")
    }
  }
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

export function createLearningMessageSpeechPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  synthesizeLearningMessageSpeech: SynthesizeLearningMessageSpeech
}) {
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

    const input = parseLearningMessageSpeechBody(body)
    if (!input) {
      return jsonError("VALIDATION_FAILED", "messageId 或 text 不合法。", 422)
    }

    try {
      const result = await dependencies.synthesizeLearningMessageSpeech(auth.userId, input)
      if (!result) {
        return jsonError("NOT_FOUND", "没有找到可播读的 AI 回复消息。", 404)
      }

      return new Response(result.audio, {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "no-store",
        },
      })
    } catch (error) {
      if (error instanceof LearningConfigurationError) {
        return jsonError("SERVICE_UNAVAILABLE", error.message, 503)
      }

      if (error instanceof LearningValidationError) {
        return jsonError("VALIDATION_FAILED", error.message, 422)
      }

      if (error instanceof LearningAIProviderError) {
        return jsonError("AI_PROVIDER_ERROR", error.message, 502)
      }

      return jsonInternalErrorFromError(error, "生成语音播读失败")
    }
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
