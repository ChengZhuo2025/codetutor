import test from "node:test"
import assert from "node:assert/strict"

import { inferAdminModelConnectionProbeStrategy } from "../server/modules/admin-ai/service.ts"

test("inferAdminModelConnectionProbeStrategy uses models list probe for quality_check models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "Qwen/Qwen3-8B",
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
      metadata: {
        profileGroup: "balanced_default",
      },
    },
    "Pro/deepseek-ai/DeepSeek-V3.2",
  )

  assert.equal(strategy, "chat")
})

test("inferAdminModelConnectionProbeStrategy keeps audio transcription probe for ASR models", () => {
  const strategy = inferAdminModelConnectionProbeStrategy(
    {
      model_name: "FunAudioLLM/SenseVoiceSmall",
      metadata: {
        capabilities: ["asr"],
      },
    },
    "FunAudioLLM/SenseVoiceSmall",
  )

  assert.equal(strategy, "audio_transcription")
})
