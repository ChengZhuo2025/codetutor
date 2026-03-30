import test from "node:test"
import assert from "node:assert/strict"

import { LearningAIProviderError } from "../server/modules/learning/errors.ts"
import { executeLearningMessageRequest } from "../server/modules/learning/http-logic.ts"
import { createLearningMessagePostHandler } from "../server/modules/learning/route-handler.ts"

function createJsonRequest(body: string, accept = "application/json") {
  return new Request("http://localhost:3000/api/learning/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: accept,
    },
    body,
  }) as never
}

test("learning message route returns 401 when request is not authenticated", async () => {
  const handler = createLearningMessagePostHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再继续。",
    executeLearningMessageRequest,
    sendLearningMessage: async () => {
      throw new Error("should not send message when unauthenticated")
    },
    streamLearningMessage: async () => {
      throw new Error("should not stream message when unauthenticated")
    },
  })

  const response = await handler(
    createJsonRequest(JSON.stringify({ inputType: "text", content: "你好" })),
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再继续。",
    data: null,
  })
})

test("learning message route returns 422 when request body is malformed json", async () => {
  const handler = createLearningMessagePostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    executeLearningMessageRequest,
    sendLearningMessage: async () => {
      throw new Error("should not send message for malformed json")
    },
    streamLearningMessage: async () => {
      throw new Error("should not stream message for malformed json")
    },
  })

  const response = await handler(createJsonRequest("{bad json"))

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "请求体不是合法 JSON。",
    data: null,
  })
})

test("learning message route returns json payload for a normal successful request", async () => {
  const handler = createLearningMessagePostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    executeLearningMessageRequest,
    sendLearningMessage: async () => ({
      conversationId: "session-1",
      taskId: "task-1",
      message: {
        id: 1001,
        role: "ai",
        kind: "coach",
        title: "AI 教练引导",
        content: "先完成最小验证。",
      },
      taskState: "in_progress",
      taskPatch: null,
    }),
    streamLearningMessage: async () => {
      throw new Error("should not call stream handler for json request")
    },
  })

  const response = await handler(
    createJsonRequest(JSON.stringify({ inputType: "text", content: "你好" })),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    code: "OK",
    message: "success",
    data: {
      conversationId: "session-1",
      taskId: "task-1",
      message: {
        id: 1001,
        role: "ai",
        kind: "coach",
        title: "AI 教练引导",
        content: "先完成最小验证。",
      },
      taskState: "in_progress",
      taskPatch: null,
    },
  })
})

test("learning message route returns sse response when stream is requested", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("event: done\ndata: {}\n\n"))
      controller.close()
    },
  })

  const handler = createLearningMessagePostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    executeLearningMessageRequest,
    sendLearningMessage: async () => {
      throw new Error("should not call json handler for sse request")
    },
    streamLearningMessage: async () => stream,
  })

  const response = await handler(
    createJsonRequest(
      JSON.stringify({ inputType: "text", content: "你好", stream: true }),
      "text/event-stream",
    ),
  )

  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get("content-type"),
    "text/event-stream; charset=utf-8",
  )
  assert.match(await response.text(), /event: done/)
})

test("learning message route returns provider failure from real execution helper as 502", async () => {
  const handler = createLearningMessagePostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    executeLearningMessageRequest,
    sendLearningMessage: async () => {
      throw new LearningAIProviderError("上游模型异常")
    },
    streamLearningMessage: async () => {
      throw new Error("should not stream for json provider failure")
    },
  })

  const response = await handler(
    createJsonRequest(JSON.stringify({ inputType: "text", content: "你好" })),
  )

  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {
    code: "AI_PROVIDER_ERROR",
    message: "上游模型异常",
    data: null,
  })
})
