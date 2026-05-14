import test from "node:test"
import assert from "node:assert/strict"

import {
  mapAdminAIMediaAttachmentRow,
  mapAdminAIMediaTranscriptionSettingRow,
  resolveLearningMediaTranscriptionModelsFromSnapshots,
  validateMediaTranscriptionModelForType,
} from "../server/modules/admin-ai/media-service.ts"

const activeProvider = {
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

const inactiveProvider = {
  ...activeProvider,
  id: "provider-disabled",
  code: "disabled",
  is_active: false,
}

const visionModel = {
  id: "model-vision",
  provider_id: "provider-aliyun",
  code: "qwen3-6-flash",
  display_name: "Qwen3.6 Flash Vision",
  model_name: "qwen3.6-flash",
  default_max_output_tokens: 1200,
  recommended_temperature: 0.1,
  is_active: true,
  runtime_capabilities: ["vision"],
}

const asrModel = {
  id: "model-asr",
  provider_id: "provider-aliyun",
  code: "qwen3-asr-flash",
  display_name: "Qwen3 ASR Flash",
  model_name: "qwen3-asr-flash",
  default_max_output_tokens: 1200,
  recommended_temperature: 0,
  is_active: true,
  runtime_capabilities: ["asr"],
}

const ttsModel = {
  id: "model-tts",
  provider_id: "provider-aliyun",
  code: "qwen3-tts-flash-realtime",
  display_name: "Qwen3 TTS Flash Realtime",
  model_name: "qwen3-tts-flash-realtime",
  default_max_output_tokens: 24000,
  recommended_temperature: 0.2,
  is_active: true,
  runtime_capabilities: ["tts"],
}

test("resolveLearningMediaTranscriptionModelsFromSnapshots uses enabled admin settings", () => {
  const resolved = resolveLearningMediaTranscriptionModelsFromSnapshots({
    providers: [activeProvider],
    models: [visionModel, asrModel, ttsModel],
    settings: [
      {
        id: "setting-image",
        media_type: "image_translation",
        model_id: "model-vision",
        is_enabled: true,
      },
      {
        id: "setting-audio",
        media_type: "speech_to_text",
        model_id: "model-asr",
        is_enabled: true,
      },
      {
        id: "setting-tts",
        media_type: "text_to_speech",
        model_id: "model-tts",
        is_enabled: true,
      },
    ],
  })

  assert.equal(resolved.vision?.provider.code, "aliyuncs")
  assert.equal(resolved.vision?.model.code, "qwen3-6-flash")
  assert.equal(resolved.asr?.provider.code, "aliyuncs")
  assert.equal(resolved.asr?.model.code, "qwen3-asr-flash")
  assert.equal(resolved.textToSpeech?.model.code, "qwen3-tts-flash-realtime")
})

test("resolveLearningMediaTranscriptionModelsFromSnapshots ignores disabled settings and inactive providers", () => {
  const resolved = resolveLearningMediaTranscriptionModelsFromSnapshots({
    providers: [inactiveProvider],
    models: [
      {
        ...visionModel,
        provider_id: "provider-disabled",
      },
      asrModel,
    ],
    settings: [
      {
        id: "setting-image",
        media_type: "image_translation",
        model_id: "model-vision",
        is_enabled: true,
      },
      {
        id: "setting-audio",
        media_type: "speech_to_text",
        model_id: "model-asr",
        is_enabled: false,
      },
    ],
  })

  assert.equal(resolved.vision, null)
  assert.equal(resolved.asr, null)
})

test("validateMediaTranscriptionModelForType enforces required runtime capability", () => {
  assert.equal(validateMediaTranscriptionModelForType("image_translation", visionModel), null)
  assert.equal(validateMediaTranscriptionModelForType("speech_to_text", asrModel), null)
  assert.equal(validateMediaTranscriptionModelForType("text_to_speech", ttsModel), null)
  assert.equal(validateMediaTranscriptionModelForType("text_to_speech", null), null)

  assert.equal(
    validateMediaTranscriptionModelForType("image_translation", asrModel),
    "图片转译需要选择具备 vision 运行时用途的启用模型。",
  )
  assert.equal(
    validateMediaTranscriptionModelForType("speech_to_text", visionModel),
    "语音转文本需要选择具备 asr 运行时用途的启用模型。",
  )
  assert.equal(
    validateMediaTranscriptionModelForType("text_to_speech", visionModel),
    "文本转语音需要选择具备 tts 运行时用途的启用模型。",
  )
})

test("mapAdminAIMediaTranscriptionSettingRow exposes model and provider summary", () => {
  const item = mapAdminAIMediaTranscriptionSettingRow(
    {
      id: "setting-image",
      media_type: "image_translation",
      model_id: "model-vision",
      is_enabled: true,
      metadata: {},
      version: 2,
      created_at: "2026-05-13T00:00:00.000Z",
      updated_at: "2026-05-13T01:00:00.000Z",
    },
    new Map([["model-vision", visionModel]]),
    new Map([["provider-aliyun", activeProvider]]),
  )

  assert.equal(item.mediaType, "image_translation")
  assert.equal(item.label, "图片转译")
  assert.equal(item.modelCode, "qwen3-6-flash")
  assert.equal(item.providerCode, "aliyuncs")
  assert.equal(item.isEnabled, true)
  assert.equal(item.version, 2)
})

test("mapAdminAIMediaAttachmentRow formats attachment list item", () => {
  const item = mapAdminAIMediaAttachmentRow(
    {
      id: "attachment-1",
      user_id: "user-1",
      session_id: "session-1",
      message_id: "message-1",
      kind: "audio",
      processing_status: "completed",
      storage_bucket: "learning-chat-attachments",
      storage_path: "user-1/voice.webm",
      original_filename: "voice.webm",
      mime_type: "audio/webm",
      size_bytes: 32000,
      duration_ms: 12000,
      width: null,
      height: null,
      extracted_text: null,
      visual_summary: null,
      transcript_text: "请解释 worktree 的用法",
      error_message: null,
      created_at: "2026-05-13T00:00:00.000Z",
      updated_at: "2026-05-13T01:00:00.000Z",
    },
    "https://storage.example.test/signed/voice.webm",
  )

  assert.equal(item.attachmentId, "attachment-1")
  assert.equal(item.kind, "audio")
  assert.equal(item.processingStatus, "completed")
  assert.equal(item.transcriptText, "请解释 worktree 的用法")
  assert.equal(item.previewUrl, "https://storage.example.test/signed/voice.webm")
})
