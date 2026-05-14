import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminAIAgentBindingBody,
  parseAdminAIAgentListQuery,
  parseAdminAIAgentSkillBindingBody,
  parseAdminAIInvocationListQuery,
  parseAdminAIModelBody,
  parseAdminAIModelTestConnectionBody,
  parseAdminAIProviderBody,
  parseAdminAIProviderTestConnectionBody,
  parseAdminAIResolvePreviewBody,
  parseAdminAITestBody,
} from "../server/lib/request-validation.ts"

test("parseAdminAIInvocationListQuery applies defaults", () => {
  const r = parseAdminAIInvocationListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.status, "all")
    assert.equal(r.data.limit, 20)
    assert.equal(r.data.page, 1)
    assert.equal(r.data.dateRange, "7d")
  }
})

test("parseAdminAIInvocationListQuery accepts structured filters", () => {
  const r = parseAdminAIInvocationListQuery(new URLSearchParams([
    ["keyword", "codex"],
    ["status", "failed"],
    ["providerCode", "siliconflow"],
    ["modelCode", "deepseek-v3-2"],
    ["agentCode", "codex-cli-coach"],
    ["dateRange", "30d"],
    ["page", "2"],
    ["limit", "50"],
  ]))

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      keyword: "codex",
      status: "failed",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      agentCode: "codex-cli-coach",
      dateRange: "30d",
      startDate: undefined,
      endDate: undefined,
      page: 2,
      limit: 50,
    })
  }
})

test("parseAdminAIAgentListQuery accepts scenario and status filters", () => {
  const r = parseAdminAIAgentListQuery(new URLSearchParams([
    ["keyword", "coach"],
    ["scenarioType", "teaching"],
    ["status", "active"],
    ["page", "3"],
    ["limit", "10"],
  ]))

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      keyword: "coach",
      scenarioType: "teaching",
      status: "active",
      page: 3,
      limit: 10,
    })
  }
})

test("parseAdminAIAgentListQuery accepts binding specific filters when enabled", () => {
  const r = parseAdminAIAgentListQuery(new URLSearchParams([
    ["keyword", "codex"],
    ["interactionType", "blocked_help"],
    ["toolId", "550e8400-e29b-41d4-a716-446655440201"],
    ["selectionMode", "preset_training"],
    ["page", "2"],
    ["limit", "10"],
  ]), {
    allowScenario: false,
    allowStatus: false,
    allowBindingFilters: true,
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      keyword: "codex",
      interactionType: "blocked_help",
      toolId: "550e8400-e29b-41d4-a716-446655440201",
      selectionMode: "preset_training",
      page: 2,
      limit: 10,
    })
  }
})

test("parseAdminAIProviderBody trims strings and preserves booleans", () => {
  const r = parseAdminAIProviderBody({
    code: " custom-openai ",
    name: " Custom OpenAI ",
    providerType: "openai_compatible",
    baseUrl: " https://api.example.com/v1 ",
    authMode: "bearer",
    apiKey: " sk-live-demo-secret ",
    keepExistingSecret: false,
    supportsStream: true,
    supportsJsonMode: false,
    timeoutMs: 45000,
    retryCount: 2,
    isActive: true,
    metadata: { owner: "ai-team" },
    changeReason: " 新增 provider ",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.code, "custom-openai")
    assert.equal(r.data.baseUrl, "https://api.example.com/v1")
    assert.equal(r.data.apiKey, "sk-live-demo-secret")
    assert.equal(r.data.keepExistingSecret, false)
    assert.equal(r.data.changeReason, "新增 provider")
  }
})

test("parseAdminAIProviderBody accepts keeping existing secret without apiKey", () => {
  const r = parseAdminAIProviderBody({
    code: "siliconflow",
    name: "SiliconFlow",
    providerType: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    authMode: "bearer",
    apiKey: "   ",
    keepExistingSecret: true,
    supportsStream: true,
    supportsJsonMode: false,
    timeoutMs: 60000,
    retryCount: 1,
    isActive: true,
    metadata: {},
    changeReason: "仅更新名称",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.apiKey, null)
    assert.equal(r.data.keepExistingSecret, true)
  }
})

test("parseAdminAIProviderBody rejects missing all secret sources", () => {
  const r = parseAdminAIProviderBody({
    code: "siliconflow",
    name: "SiliconFlow",
    providerType: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    authMode: "bearer",
    envSecretRef: null,
    apiKey: "   ",
    keepExistingSecret: false,
    supportsStream: true,
    supportsJsonMode: false,
    timeoutMs: 60000,
    retryCount: 1,
    isActive: true,
    metadata: {},
    changeReason: "补全校验",
  })

  assert.equal(r.ok, false)
  if (!r.ok) {
    assert.equal(r.message, "至少提供 apiKey、keepExistingSecret 或 envSecretRef 之一。")
  }
})

test("parseAdminAIProviderTestConnectionBody defaults timeout and trims baseUrl", () => {
  const r = parseAdminAIProviderTestConnectionBody({
    baseUrl: " https://api.siliconflow.cn/v1 ",
    authMode: "bearer",
    providerType: "siliconflow",
    envSecretRef: null,
    apiKey: null,
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.baseUrl, "https://api.siliconflow.cn/v1")
    assert.equal(r.data.timeoutMs, 15_000)
    assert.equal(r.data.envSecretRef, null)
    assert.equal(r.data.apiKey, null)
  }
})

test("parseAdminAIModelTestConnectionBody trims and caps maxOutputTokens", () => {
  const r = parseAdminAIModelTestConnectionBody({
    providerCode: " siliconflow ",
    modelName: " zai-org/GLM-4.6 ",
    maxOutputTokens: 128,
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.providerCode, "siliconflow")
    assert.equal(r.data.modelName, "zai-org/GLM-4.6")
    assert.equal(r.data.maxOutputTokens, 128)
    assert.equal(r.data.timeoutMs, undefined)
  }
})

test("parseAdminAIModelBody rejects missing changeReason", () => {
  const r = parseAdminAIModelBody({
    providerCode: "siliconflow",
    code: "deepseek-v3-2",
    displayName: "DeepSeek V3.2",
    modelName: "Pro/deepseek-ai/DeepSeek-V3.2",
    supportsStream: true,
    supportsJsonMode: false,
    supportsToolCalling: false,
    maxContextTokens: 64000,
    defaultMaxOutputTokens: 4096,
    recommendedTemperature: 0.3,
    modelFamily: "chat",
    runtimeCapabilities: [],
    connectionTestMode: "chat",
    reasoningEnabled: false,
    profileGroup: "balanced_default",
    notes: "默认主聊天模型",
    pricingMetadata: {},
    isActive: true,
    metadata: {},
  })

  assert.equal(r.ok, false)
})

test("parseAdminAIModelBody accepts structured model profile fields", () => {
  const r = parseAdminAIModelBody({
    providerCode: " siliconflow ",
    code: " deepseek-r1 ",
    displayName: " DeepSeek R1 ",
    modelName: " Pro/deepseek-ai/DeepSeek-R1 ",
    supportsStream: true,
    supportsJsonMode: false,
    supportsToolCalling: false,
    maxContextTokens: 64000,
    defaultMaxOutputTokens: 4096,
    recommendedTemperature: 0.6,
    modelFamily: "reasoning",
    runtimeCapabilities: ["quality_check"],
    connectionTestMode: "models_list",
    reasoningEnabled: true,
    profileGroup: "reasoning_lab",
    notes: " 质量闸门与复杂推理 ",
    pricingMetadata: {},
    isActive: true,
    metadata: { routePolicy: "manual_test_only" },
    changeReason: " 调整结构化字段 ",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.code, "deepseek-r1")
    assert.equal(r.data.modelFamily, "reasoning")
    assert.deepEqual(r.data.runtimeCapabilities, ["quality_check"])
    assert.equal(r.data.connectionTestMode, "models_list")
    assert.equal(r.data.reasoningEnabled, true)
    assert.equal(r.data.profileGroup, "reasoning_lab")
    assert.equal(r.data.notes, "质量闸门与复杂推理")
    assert.deepEqual(r.data.metadata, { routePolicy: "manual_test_only" })
  }
})

test("parseAdminAIModelBody accepts tts model profile fields", () => {
  const r = parseAdminAIModelBody({
    providerCode: " aliyuncs ",
    code: " qwen3-tts-flash-realtime ",
    displayName: " Qwen3 TTS Flash Realtime ",
    modelName: " qwen3-tts-flash-realtime ",
    supportsStream: true,
    supportsJsonMode: false,
    supportsToolCalling: false,
    maxContextTokens: 128000,
    defaultMaxOutputTokens: 24000,
    recommendedTemperature: 0.2,
    modelFamily: "tts",
    runtimeCapabilities: ["tts"],
    connectionTestMode: "tts",
    reasoningEnabled: false,
    profileGroup: "balanced_default",
    notes: "语音合成",
    pricingMetadata: {},
    isActive: true,
    metadata: {},
    changeReason: "新增 TTS 模型",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.modelFamily, "tts")
    assert.deepEqual(r.data.runtimeCapabilities, ["tts"])
    assert.equal(r.data.connectionTestMode, "tts")
  }
})

test("parseAdminAIAgentBindingBody accepts nullable targeting filters", () => {
  const r = parseAdminAIAgentBindingBody({
    agentCode: "codex-cli-coach",
    toolId: null,
    learningLevel: "intermediate",
    selectionMode: null,
    pathId: null,
    stepNo: null,
    interactionType: "teaching",
    priority: 15,
    isActive: true,
    metadata: { bindingKind: "manual_override" },
    changeReason: " 调整默认命中顺序 ",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.agentCode, "codex-cli-coach")
    assert.equal(r.data.learningLevel, "intermediate")
    assert.equal(r.data.priority, 15)
    assert.equal(r.data.changeReason, "调整默认命中顺序")
  }
})

test("parseAdminAIAgentSkillBindingBody accepts required skill binding", () => {
  const r = parseAdminAIAgentSkillBindingBody({
    agentCode: "codex-cli-coach",
    skillCode: "codex-cli-basics-skill",
    priority: 10,
    isRequired: true,
    contextBudgetTokens: 900,
    isActive: true,
    metadata: {},
    changeReason: "补齐技能上下文",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.skillCode, "codex-cli-basics-skill")
    assert.equal(r.data.contextBudgetTokens, 900)
  }
})

test("parseAdminAIResolvePreviewBody accepts preview context", () => {
  const r = parseAdminAIResolvePreviewBody({
    interactionType: "blocked_help",
    toolId: "550e8400-e29b-41d4-a716-446655440021",
    learningLevel: "intermediate",
    selectionMode: "preset_training",
    pathId: "550e8400-e29b-41d4-a716-446655440022",
    stepNo: 2,
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.interactionType, "blocked_help")
    assert.equal(r.data.stepNo, 2)
  }
})

test("parseAdminAITestBody requires prompt and changeReason", () => {
  const r = parseAdminAITestBody({
    agentCode: "codex-cli-coach",
    providerCode: "siliconflow",
    modelCode: "deepseek-v3-2",
    prompt: "  请帮我审查这段 CLI 工作流  ",
    stream: false,
    changeReason: " 发布前联调 ",
  })

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.prompt, "请帮我审查这段 CLI 工作流")
    assert.equal(r.data.changeReason, "发布前联调")
  }
})
