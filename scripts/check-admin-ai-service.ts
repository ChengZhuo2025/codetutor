import test from "node:test"
import assert from "node:assert/strict"

import {
  inferAdminModelConnectionProbeStrategy,
  matchesAdminAIAgentBindingFilters,
} from "../server/modules/admin-ai/service.ts"
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

test("matchesAdminAIAgentBindingFilters matches by agent name, tool name, interaction type and selection mode", () => {
  const row = {
    bindingId: "binding-1",
    agentCode: "codex-cli-coach",
    agentName: "Codex CLI 工作流教练",
    toolId: "550e8400-e29b-41d4-a716-446655440201",
    toolCode: "cursor",
    toolName: "Cursor",
    learningLevel: "intermediate",
    selectionMode: "preset_training",
    pathId: "550e8400-e29b-41d4-a716-446655440202",
    pathCode: "cursor-workflow",
    pathName: "Cursor 工作流",
    stepNo: null,
    interactionType: "blocked_help",
    priority: 10,
    isActive: true,
    metadata: {},
    createdAt: "2026-04-05T10:00:00.000Z",
    updatedAt: "2026-04-05T10:00:00.000Z",
  }

  assert.equal(
    matchesAdminAIAgentBindingFilters(row, {
      keyword: "cursor",
      interactionType: "blocked_help",
      toolId: "550e8400-e29b-41d4-a716-446655440201",
      selectionMode: "preset_training",
    }),
    true,
  )
  assert.equal(
    matchesAdminAIAgentBindingFilters(row, {
      keyword: "工作流教练",
      interactionType: "blocked_help",
    }),
    true,
  )
  assert.equal(
    matchesAdminAIAgentBindingFilters(row, {
      keyword: "not-match",
    }),
    false,
  )
})
