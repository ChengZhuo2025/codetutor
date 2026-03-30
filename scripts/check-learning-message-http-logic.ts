import test from "node:test"
import assert from "node:assert/strict"

import type { LearningMessageResponseData } from "../lib/api/contracts/learning.ts"
import { LearningAIProviderError } from "../server/modules/learning/errors.ts"
import {
  executeLearningMessageRequest,
  buildIdempotentReplaySSEEvents,
} from "../server/modules/learning/http-logic.ts"

const sampleResponse: LearningMessageResponseData = {
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
}

test("executeLearningMessageRequest returns json success payload when stream is not requested", async () => {
  const result = await executeLearningMessageRequest({
    userId: "user-1",
    acceptHeader: "application/json",
    body: {
      inputType: "text",
      content: "你好",
    },
    sendMessage: async () => sampleResponse,
    streamMessage: async () => {
      throw new Error("should not call stream handler")
    },
  })

  assert.equal(result.kind, "json")
  assert.equal(result.status, 200)
  assert.equal(result.body.code, "OK")
  assert.deepEqual(result.body.data, sampleResponse)
})

test("executeLearningMessageRequest returns sse transport when client explicitly requests stream", async () => {
  const stream = new ReadableStream<Uint8Array>()
  const result = await executeLearningMessageRequest({
    userId: "user-1",
    acceptHeader: "text/event-stream",
    body: {
      inputType: "text",
      content: "你好",
      stream: true,
    },
    sendMessage: async () => {
      throw new Error("should not call json handler")
    },
    streamMessage: async () => stream,
  })

  assert.equal(result.kind, "sse")
  assert.equal(result.status, 200)
  assert.equal(result.stream, stream)
})

test("executeLearningMessageRequest maps provider failures to a stable 502 api error", async () => {
  const result = await executeLearningMessageRequest({
    userId: "user-1",
    acceptHeader: "application/json",
    body: {
      inputType: "text",
      content: "你好",
    },
    sendMessage: async () => {
      throw new LearningAIProviderError("上游模型异常")
    },
    streamMessage: async () => {
      throw new Error("should not call stream handler")
    },
  })

  assert.equal(result.kind, "json")
  assert.equal(result.status, 502)
  assert.deepEqual(result.body, {
    code: "AI_PROVIDER_ERROR",
    message: "上游模型异常",
    data: null,
  })
})

test("buildIdempotentReplaySSEEvents returns a deterministic replay event sequence", () => {
  assert.deepEqual(
    buildIdempotentReplaySSEEvents({
      conversationId: "session-1",
      interactionType: "blocked_help",
      agentCode: "coach_general",
      modelCode: "glm-5",
      providerCode: "siliconflow",
      messageTitle: "排查建议",
      messageKind: "coach",
      messageContent: "先贴出完整报错。",
      structuredContent: {
        variant: "blocked_help",
        summary: "先贴出完整报错。",
        blocks: [],
      },
      taskPatch: {
        taskId: "task-1",
        status: "blocked",
        suggestedNextAction: "补充完整报错文本",
      },
    }),
    [
      {
        event: "session_started",
        data: {
          conversationId: "session-1",
          interactionType: "blocked_help",
          agentCode: "coach_general",
          modelCode: "glm-5",
          providerCode: "siliconflow",
        },
      },
      {
        event: "task_patch",
        data: {
          taskId: "task-1",
          status: "blocked",
          suggestedNextAction: "补充完整报错文本",
        },
      },
      {
        event: "assistant_delta",
        data: {
          delta: "先贴出完整报错。",
        },
      },
      {
        event: "assistant_done",
        data: {
          title: "排查建议",
          kind: "coach",
          structuredContent: {
            variant: "blocked_help",
            summary: "先贴出完整报错。",
            blocks: [],
          },
          finishReason: "idempotent_replay",
          usage: null,
        },
      },
    ],
  )
})
