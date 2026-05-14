import test from "node:test"
import assert from "node:assert/strict"

import { inferAdminModelConnectionProbeStrategy } from "../server/modules/admin-ai/service.ts"
import { resolveStoredModelProfile } from "../server/modules/ai/model-profile.ts"

test("resolveStoredModelProfile keeps tts runtime capability and infers tts fields", () => {
  const profile = resolveStoredModelProfile({
    modelFamily: null,
    runtimeCapabilities: ["tts"],
    connectionTestMode: null,
    reasoningEnabled: false,
    profileGroup: null,
    metadata: {},
  })

  assert.equal(profile.modelFamily, "tts")
  assert.deepEqual(profile.runtimeCapabilities, ["tts"])
  assert.equal(profile.connectionTestMode, "tts")
})

test("inferAdminModelConnectionProbeStrategy prefers structured connectionTestMode", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "Qwen/Qwen3-8B",
      connection_test_mode: "asr",
      runtime_capabilities: [],
      reasoning_enabled: false,
      profile_group: null,
      metadata: {
        capabilities: ["quality_check"],
      },
    },
    "Qwen/Qwen3-8B",
  )

  assert.equal(strategy, "models_list")
})

test("inferAdminModelConnectionProbeStrategy uses models list probe for quality_check models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "Qwen/Qwen3-8B",
      connection_test_mode: null,
      runtime_capabilities: ["quality_check"],
      reasoning_enabled: false,
      profile_group: null,
      metadata: {
        capabilities: ["quality_check"],
      },
    },
    "Qwen/Qwen3-8B",
  )

  assert.equal(strategy, "models_list")
})

test("inferAdminModelConnectionProbeStrategy uses models list probe for thinking-enabled models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "Pro/deepseek-ai/DeepSeek-R1",
      connection_test_mode: null,
      runtime_capabilities: [],
      reasoning_enabled: true,
      profile_group: null,
      metadata: {
        enableThinking: true,
      },
    },
    "Pro/deepseek-ai/DeepSeek-R1",
  )

  assert.equal(strategy, "models_list")
})

test("inferAdminModelConnectionProbeStrategy keeps chat probe for regular chat models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "Pro/deepseek-ai/DeepSeek-V3.2",
      connection_test_mode: null,
      runtime_capabilities: [],
      reasoning_enabled: false,
      profile_group: "balanced_default",
      metadata: {
        profileGroup: "balanced_default",
      },
    },
    "Pro/deepseek-ai/DeepSeek-V3.2",
  )

  assert.equal(strategy, "chat")
})

test("inferAdminModelConnectionProbeStrategy uses models list probe for qwen3 ASR models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "qwen3-asr-flash",
      connection_test_mode: null,
      runtime_capabilities: ["asr"],
      reasoning_enabled: false,
      profile_group: null,
      metadata: {
        capabilities: ["asr"],
      },
    },
    "qwen3-asr-flash",
  )

  assert.equal(strategy, "models_list")
})

test("inferAdminModelConnectionProbeStrategy uses models list probe for legacy ASR models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "FunAudioLLM/SenseVoiceSmall",
      connection_test_mode: null,
      runtime_capabilities: ["asr"],
      reasoning_enabled: false,
      profile_group: null,
      metadata: {
        capabilities: ["asr"],
      },
    },
    "FunAudioLLM/SenseVoiceSmall",
  )

  assert.equal(strategy, "models_list")
})

test("inferAdminModelConnectionProbeStrategy uses realtime probe for tts models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "qwen3-tts-flash-realtime",
      connection_test_mode: null,
      runtime_capabilities: ["tts"],
      reasoning_enabled: false,
      profile_group: null,
      metadata: {
        capabilities: ["text_to_speech"],
      },
    },
    "qwen3-tts-flash-realtime",
  )

  assert.equal(strategy, "tts_realtime")
})
