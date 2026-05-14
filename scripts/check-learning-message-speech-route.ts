import test from "node:test"
import assert from "node:assert/strict"

import { createLearningMessageSpeechPostHandler } from "../server/modules/learning/route-handler.ts"
import {
  LearningAIProviderError,
  LearningConfigurationError,
  LearningValidationError,
} from "../server/modules/learning/errors.ts"

const ASSISTANT_MESSAGE_ID = "11111111-1111-4111-8111-111111111111"

function createJsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/learning/message-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }) as never
}

test("learning message speech route returns 401 when unauthenticated", async () => {
  const handler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再继续。",
    synthesizeLearningMessageSpeech: async () => {
      throw new Error("should not synthesize without auth")
    },
  })

  const response = await handler(createJsonRequest({ messageId: ASSISTANT_MESSAGE_ID }))

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再继续。",
    data: null,
  })
})

test("learning message speech route returns audio when synthesis succeeds", async () => {
  const audio = Buffer.from("RIFF....WAVE", "ascii")
  const handler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    synthesizeLearningMessageSpeech: async (userId, input) => {
      assert.equal(userId, "user-1")
      assert.equal(input.messageId, ASSISTANT_MESSAGE_ID)
      assert.equal(input.text, "请先完成最小验证。")
      return {
        audio,
        contentType: "audio/wav",
      }
    },
  })

  const response = await handler(createJsonRequest({
    messageId: ASSISTANT_MESSAGE_ID,
    text: "请先完成最小验证。",
  }))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "audio/wav")
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio)
})

test("learning message speech route maps missing tts config to 503", async () => {
  const handler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    synthesizeLearningMessageSpeech: async () => {
      throw new LearningConfigurationError("当前未配置文本转语音模型。")
    },
  })

  const response = await handler(createJsonRequest({ messageId: ASSISTANT_MESSAGE_ID }))

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    code: "SERVICE_UNAVAILABLE",
    message: "当前未配置文本转语音模型。",
    data: null,
  })
})

test("learning message speech route maps validation and provider errors", async () => {
  const validationHandler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    synthesizeLearningMessageSpeech: async () => {
      throw new LearningValidationError("没有可播读的 AI 回复内容。")
    },
  })

  const validationResponse = await validationHandler(createJsonRequest({ messageId: ASSISTANT_MESSAGE_ID }))
  assert.equal(validationResponse.status, 422)

  const providerHandler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    synthesizeLearningMessageSpeech: async () => {
      throw new LearningAIProviderError("TTS request failed")
    },
  })

  const providerResponse = await providerHandler(createJsonRequest({ messageId: ASSISTANT_MESSAGE_ID }))
  assert.equal(providerResponse.status, 502)
})

test("learning message speech route rejects display-only numeric message id before synthesis", async () => {
  const handler = createLearningMessageSpeechPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    synthesizeLearningMessageSpeech: async () => {
      throw new Error("should not synthesize with a non-uuid display id")
    },
  })

  const response = await handler(createJsonRequest({
    messageId: "2",
    text: "已从你的材料生成学习任务。",
  }))

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "messageId 必须是 AI 回复消息的持久化 ID。",
    data: null,
  })
})
