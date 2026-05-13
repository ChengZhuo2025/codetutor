import test from "node:test"
import assert from "node:assert/strict"

import {
  invokeMaterialAudioTranscription,
  resolveMaterialPipelineModelsFromSnapshots,
  type MaterialPipelineRuntime,
} from "../server/modules/learning-materials/providers.ts"
import { executeLearningMessageRequest } from "../server/modules/learning/http-logic.ts"

const aliyunProvider = {
  id: "provider-aliyun",
  code: "aliyuncs",
  provider_type: "openai_compatible" as const,
  base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  auth_mode: "bearer" as const,
  secret_ref: "TEST_ALIYUN_API_KEY",
  secret_ciphertext: null,
  secret_iv: null,
  secret_auth_tag: null,
  secret_key_version: null,
  timeout_ms: 30000,
  retry_count: 1,
  is_active: true,
}

const siliconflowProvider = {
  id: "provider-siliconflow",
  code: "siliconflow",
  provider_type: "siliconflow" as const,
  base_url: "https://api.siliconflow.cn/v1",
  auth_mode: "bearer" as const,
  secret_ref: "TEST_SILICONFLOW_API_KEY",
  secret_ciphertext: null,
  secret_iv: null,
  secret_auth_tag: null,
  secret_key_version: null,
  timeout_ms: 30000,
  retry_count: 1,
  is_active: true,
}

test("material pipeline resolves Bailian Qwen models for vision and ASR capabilities", () => {
  const result = resolveMaterialPipelineModelsFromSnapshots({
    providers: [aliyunProvider, siliconflowProvider],
    models: [
      {
        id: "model-vision",
        provider_id: "provider-aliyun",
        code: "qwen3-6-flash",
        model_name: "qwen3.6-flash",
        default_max_output_tokens: 1200,
        recommended_temperature: 0.1,
        is_active: true,
        runtime_capabilities: ["vision"],
      },
      {
        id: "model-asr",
        provider_id: "provider-aliyun",
        code: "qwen3-asr-flash",
        model_name: "qwen3-asr-flash",
        default_max_output_tokens: 1200,
        recommended_temperature: 0,
        is_active: true,
        runtime_capabilities: ["asr"],
      },
      {
        id: "model-old-vision",
        provider_id: "provider-siliconflow",
        code: "qwen2-5-vl-72b",
        model_name: "Qwen/Qwen2.5-VL-72B-Instruct",
        default_max_output_tokens: 1200,
        recommended_temperature: 0.1,
        is_active: false,
        runtime_capabilities: ["vision"],
      },
    ],
  })

  assert.equal(result.vision?.provider.code, "aliyuncs")
  assert.equal(result.vision?.model.code, "qwen3-6-flash")
  assert.equal(result.vision?.model.modelName, "qwen3.6-flash")
  assert.equal(result.asr?.provider.code, "aliyuncs")
  assert.equal(result.asr?.model.code, "qwen3-asr-flash")
  assert.equal(result.asr?.model.modelName, "qwen3-asr-flash")
})

test("material pipeline env overrides can pin dedicated multimodal model codes", () => {
  const result = resolveMaterialPipelineModelsFromSnapshots({
    providers: [aliyunProvider],
    env: {
      MATERIAL_PLAN_VISION_MODEL_CODE: "qwen3-6-flash",
      MATERIAL_PLAN_ASR_MODEL_CODE: "qwen3-asr-flash",
    },
    models: [
      {
        id: "model-other-vision",
        provider_id: "provider-aliyun",
        code: "other-vision",
        model_name: "other-vision",
        default_max_output_tokens: 1200,
        recommended_temperature: 0.1,
        is_active: true,
        runtime_capabilities: ["vision"],
      },
      {
        id: "model-vision",
        provider_id: "provider-aliyun",
        code: "qwen3-6-flash",
        model_name: "qwen3.6-flash",
        default_max_output_tokens: 1200,
        recommended_temperature: 0.1,
        is_active: true,
        runtime_capabilities: ["vision"],
      },
      {
        id: "model-asr",
        provider_id: "provider-aliyun",
        code: "qwen3-asr-flash",
        model_name: "qwen3-asr-flash",
        default_max_output_tokens: 1200,
        recommended_temperature: 0,
        is_active: true,
        runtime_capabilities: ["asr"],
      },
    ],
  })

  assert.equal(result.vision?.model.code, "qwen3-6-flash")
  assert.equal(result.asr?.model.code, "qwen3-asr-flash")
})

test("Qwen3-ASR Flash uses Bailian chat completions with input_audio data URL", async () => {
  const originalFetch = globalThis.fetch
  const originalSecret = process.env.TEST_ALIYUN_API_KEY
  const capturedRequests: Array<{
    url: string
    init?: RequestInit
    body?: Record<string, unknown>
  }> = []

  process.env.TEST_ALIYUN_API_KEY = "test-key"
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const body = typeof init?.body === "string"
      ? JSON.parse(init.body) as Record<string, unknown>
      : undefined

    capturedRequests.push({ url, init, body })

    if (url === "https://storage.example.test/voice.webm") {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "audio/webm",
        },
      })
    }

    if (url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions") {
      return Response.json({
        choices: [
          {
            message: {
              content: "worktree 和分支的区别是什么",
            },
          },
        ],
      })
    }

    throw new Error(`Unexpected fetch: ${url}`)
  }) as typeof fetch

  try {
    const runtime: MaterialPipelineRuntime = {
      provider: {
        code: "aliyuncs",
        providerType: "openai_compatible",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        authMode: "bearer",
        envSecretRef: "TEST_ALIYUN_API_KEY",
        secretCiphertext: null,
        secretIv: null,
        secretAuthTag: null,
        secretKeyVersion: null,
        timeoutMs: 30000,
        retryCount: 1,
      },
      model: {
        code: "qwen3-asr-flash",
        modelName: "qwen3-asr-flash",
        defaultMaxOutputTokens: 1200,
        recommendedTemperature: 0,
      },
    }

    const result = await invokeMaterialAudioTranscription({
      runtime,
      mediaUrl: "https://storage.example.test/voice.webm",
    })

    assert.equal(result.text, "worktree 和分支的区别是什么")
    assert.equal(capturedRequests.length, 2)
    assert.equal(capturedRequests[1].url, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
    assert.equal((capturedRequests[1].init?.headers as Headers).get("Authorization"), "Bearer test-key")

    const requestBody = capturedRequests[1].body
    assert.equal(requestBody?.model, "qwen3-asr-flash")
    assert.equal(requestBody?.stream, false)
    assert.deepEqual(requestBody?.asr_options, { enable_itn: false })

    const messages = requestBody?.messages as Array<{ content: Array<{ type: string; input_audio?: { data: string; format: string } }> }>
    const audioPart = messages[0].content[0]
    assert.equal(audioPart.type, "input_audio")
    assert.equal(audioPart.input_audio?.format, "webm")
    assert.equal(audioPart.input_audio?.data, "data:audio/webm;base64,AQID")
  } finally {
    globalThis.fetch = originalFetch
    if (originalSecret === undefined) {
      delete process.env.TEST_ALIYUN_API_KEY
    } else {
      process.env.TEST_ALIYUN_API_KEY = originalSecret
    }
  }
})

test("learning message execution forwards image and audio attachment ids into JSON handler", async () => {
  const attachmentIds = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ]

  const result = await executeLearningMessageRequest({
    userId: "user-1",
    acceptHeader: "application/json",
    body: {
      inputType: "text",
      content: "请帮我看下截图和语音描述",
      attachmentIds,
    },
    sendMessage: async (userId, request) => {
      assert.equal(userId, "user-1")
      assert.deepEqual(request.attachmentIds, attachmentIds)
      return {
        conversationId: "session-1",
        taskId: "task-1",
        message: {
          id: 1001,
          role: "ai",
          kind: "coach",
          title: "AI 教练引导",
          content: "我会结合图片和语音说明来分析。",
        },
        taskState: "in_progress",
        taskPatch: null,
      }
    },
    streamMessage: async () => {
      throw new Error("should not call stream handler")
    },
  })

  assert.equal(result.kind, "json")
  assert.equal(result.status, 200)
  assert.equal(result.body.data?.message.content, "我会结合图片和语音说明来分析。")
})
