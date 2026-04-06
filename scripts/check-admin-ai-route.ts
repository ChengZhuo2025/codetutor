import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminAIAgentBindingDetailPatchHandler,
  createAdminAIAgentBindingListHandler,
  createAdminAIAgentDetailHandlers,
  createAdminAIAgentListHandler,
  createAdminAIAgentSkillBindingDetailPatchHandler,
  createAdminAIAgentSkillBindingListHandler,
  createAdminAIInvocationDetailGetHandler,
  createAdminAIInvocationListGetHandler,
  createAdminAIModelDetailHandlers,
  createAdminAIModelListHandler,
  createAdminAIOverviewGetHandler,
  createAdminAIProviderDetailHandlers,
  createAdminAIProviderListHandler,
  createAdminAIProviderSecretRevealPostHandler,
  createAdminAIResolvePreviewPostHandler,
  createAdminAISkillListGetHandler,
  createAdminAITestPostHandler,
} from "../server/modules/admin-ai/route-handler.ts"
import type {
  AdminAIAgentDetailResponseData,
  AdminAIAgentListResponseData,
  AdminAIAgentSkillBindingListResponseData,
  AdminAIInvocationDetailResponseData,
  AdminAIInvocationListResponseData,
  AdminAIModelDetailResponseData,
  AdminAIModelListResponseData,
  AdminAIOverviewResponseData,
  AdminAIProviderDetailResponseData,
  AdminAIProviderListResponseData,
  AdminAIResolvePreviewResponseData,
  AdminAISkillListResponseData,
  AdminAITestResponseData,
} from "../lib/api/contracts/admin-ai.ts"

const okAdmin = { ok: true as const, adminId: "admin-uuid-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleOverview: AdminAIOverviewResponseData = {
  permissions: {
    canView: true,
    canManage: true,
  },
  stats: {
    totalProviders: 1,
    activeProviders: 1,
    totalModels: 3,
    activeModels: 3,
    totalAgents: 28,
    activeAgents: 28,
    totalSkills: 32,
    activeSkills: 32,
    invocationCountLast7Days: 120,
    failedInvocationCountLast7Days: 8,
    successRateLast7Days: 0.9333,
  },
  topAgents: [
    {
      agentCode: "codex-cli-coach",
      agentName: "Codex CLI 工作流教练",
      invocationCount: 32,
      failedInvocationCount: 1,
    },
  ],
  recentFailures: [
    {
      invocationId: "550e8400-e29b-41d4-a716-446655440091",
      agentCode: "codex-cli-coach",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      errorMessage: "timeout",
      createdAt: "2026-04-05T10:00:00.000Z",
    },
  ],
}

const sampleProviderList: AdminAIProviderListResponseData = {
  items: [
    {
      providerId: "550e8400-e29b-41d4-a716-446655440101",
      code: "siliconflow",
      name: "SiliconFlow",
      providerType: "siliconflow",
      baseUrl: "https://api.siliconflow.cn/v1",
      authMode: "bearer",
      secretSource: "database",
      secretMasked: "sk-live-********wxyz",
      envSecretRef: "SILICONFLOW_API_KEY",
      hasStoredSecret: true,
      supportsStream: true,
      supportsJsonMode: false,
      timeoutMs: 60000,
      retryCount: 1,
      isActive: true,
      modelCount: 3,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleProviderDetail: AdminAIProviderDetailResponseData = {
  provider: {
    providerId: "550e8400-e29b-41d4-a716-446655440101",
    code: "siliconflow",
    name: "SiliconFlow",
    providerType: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    authMode: "bearer",
    secretSource: "database",
    secretMasked: "sk-live-********wxyz",
    envSecretRef: "SILICONFLOW_API_KEY",
    hasStoredSecret: true,
    supportsStream: true,
    supportsJsonMode: false,
    timeoutMs: 60000,
    retryCount: 1,
    isActive: true,
    metadata: {},
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
  linkedModelCodes: ["deepseek-v3-2"],
  linkedAgentCodes: ["codex-cli-coach"],
}

const sampleModelList: AdminAIModelListResponseData = {
  items: [
    {
      modelId: "550e8400-e29b-41d4-a716-446655440102",
      providerId: "550e8400-e29b-41d4-a716-446655440101",
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
      isActive: true,
      linkedAgentCount: 4,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleModelDetail: AdminAIModelDetailResponseData = {
  model: {
    modelId: "550e8400-e29b-41d4-a716-446655440102",
    providerId: "550e8400-e29b-41d4-a716-446655440101",
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
    pricingMetadata: {},
    isActive: true,
    metadata: {},
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
  linkedAgentCodes: ["codex-cli-coach"],
}

const sampleAgentList: AdminAIAgentListResponseData = {
  items: [
    {
      agentId: "550e8400-e29b-41d4-a716-446655440103",
      code: "codex-cli-coach",
      name: "Codex CLI 工作流教练",
      scenarioType: "teaching",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      streamEnabled: true,
      isActive: true,
      bindingCount: 2,
      skillCount: 3,
      updatedAt: "2026-04-05T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleAgentDetail: AdminAIAgentDetailResponseData = {
  agent: {
    agentId: "550e8400-e29b-41d4-a716-446655440103",
    code: "codex-cli-coach",
    name: "Codex CLI 工作流教练",
    scenarioType: "teaching",
    description: "CLI 工具工作流主教练",
    systemPromptTemplate: "你是 Codex CLI 工作流教练。",
    developerPromptTemplate: "优先拆解当前一步。",
    defaultProviderCode: "siliconflow",
    defaultModelCode: "deepseek-v3-2",
    contextMessageLimit: 8,
    maxOutputTokens: 2600,
    temperature: 0.2,
    topP: 0.8,
    streamEnabled: true,
    isActive: true,
    metadata: {},
    version: 1,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
  bindings: [],
  skillBindings: [],
}

const sampleSkillList: AdminAISkillListResponseData = {
  items: [
    {
      skillId: "550e8400-e29b-41d4-a716-446655440104",
      code: "codex-cli-basics-skill",
      name: "Codex CLI 基础",
      version: "1.0.0",
      sourceType: "built_in",
      trustLevel: "internal_verified",
      rootPath: "ai/skills/codex-cli-basics-skill",
      manifestPath: "ai/skills/codex-cli-basics-skill/SKILL.md",
      entryResourcePath: "ai/skills/codex-cli-basics-skill/SKILL.md",
      scriptsEnabled: false,
      isActive: true,
      metadata: {},
      linkedAgentCount: 1,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleAgentSkillBindingList: AdminAIAgentSkillBindingListResponseData = {
  items: [
    {
      bindingId: "550e8400-e29b-41d4-a716-446655440105",
      agentCode: "codex-cli-coach",
      agentName: "Codex CLI 工作流教练",
      skillCode: "codex-cli-basics-skill",
      skillName: "Codex CLI 基础",
      priority: 10,
      isRequired: true,
      contextBudgetTokens: 900,
      isActive: true,
      metadata: {},
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleInvocationList: AdminAIInvocationListResponseData = {
  items: [
    {
      invocationId: "550e8400-e29b-41d4-a716-446655440106",
      sessionId: "550e8400-e29b-41d4-a716-446655440107",
      userId: "550e8400-e29b-41d4-a716-446655440108",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      agentCode: "codex-cli-coach",
      status: "succeeded",
      streamEnabled: true,
      totalTokens: 1234,
      latencyMs: 890,
      finishReason: "stop",
      errorCode: null,
      createdAt: "2026-04-05T10:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const sampleInvocationDetail: AdminAIInvocationDetailResponseData = {
  invocation: {
    invocationId: "550e8400-e29b-41d4-a716-446655440106",
    sessionId: "550e8400-e29b-41d4-a716-446655440107",
    assistantMessageId: "550e8400-e29b-41d4-a716-446655440109",
    userMessageId: "550e8400-e29b-41d4-a716-446655440110",
    userId: "550e8400-e29b-41d4-a716-446655440108",
    providerCode: "siliconflow",
    modelCode: "deepseek-v3-2",
    agentCode: "codex-cli-coach",
    status: "succeeded",
    streamEnabled: true,
    promptTokens: 456,
    completionTokens: 778,
    totalTokens: 1234,
    latencyMs: 890,
    firstChunkLatencyMs: 230,
    finishReason: "stop",
    errorCode: null,
    errorMessage: null,
    requestPayloadRedacted: { messageCount: 2 },
    responsePayloadRedacted: { contentLength: 1200 },
    createdAt: "2026-04-05T10:00:00.000Z",
  },
}

const samplePreview: AdminAIResolvePreviewResponseData = {
  matchedBinding: {
    bindingId: "550e8400-e29b-41d4-a716-446655440111",
    agentCode: "codex-cli-coach",
    priority: 10,
    specificityScore: 3,
  },
  agent: {
    code: "codex-cli-coach",
    name: "Codex CLI 工作流教练",
    providerCode: "siliconflow",
    modelCode: "deepseek-v3-2",
  },
  matchedSkills: [
    {
      bindingId: "550e8400-e29b-41d4-a716-446655440112",
      skillCode: "codex-cli-basics-skill",
      skillName: "Codex CLI 基础",
      priority: 10,
    },
  ],
}

const sampleTestResult: AdminAITestResponseData = {
  invocationId: "550e8400-e29b-41d4-a716-446655440113",
  providerCode: "siliconflow",
  modelCode: "deepseek-v3-2",
  agentCode: "codex-cli-coach",
  status: "succeeded",
  content: "建议先拆一个最小 CLI 工作流任务。",
  finishReason: "stop",
  usage: {
    promptTokens: 100,
    completionTokens: 120,
    totalTokens: 220,
  },
  latencyMs: 780,
  requestPayloadRedacted: {
    messageCount: 2,
  },
  responsePayloadRedacted: {
    contentLength: 18,
  },
}

test("admin ai overview returns 403 without admin", async () => {
  const handler = createAdminAIOverviewGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminAIOverview: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(new Request("http://localhost/api/admin/ai/overview"))
  assert.equal(res.status, 403)
})

test("admin ai overview returns 200 with data", async () => {
  const handler = createAdminAIOverviewGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIOverview: async () => sampleOverview,
  })

  const res = await handler(new Request("http://localhost/api/admin/ai/overview"))
  assert.equal(res.status, 200)
})

test("admin ai provider list returns 200", async () => {
  const handler = createAdminAIProviderListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIProviderList: async () => sampleProviderList,
    createAdminAIProvider: async () => sampleProviderDetail,
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/providers"))
  assert.equal(res.status, 200)
})

test("admin ai provider create rejects invalid request", async () => {
  const handler = createAdminAIProviderListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIProviderList: async () => sampleProviderList,
    createAdminAIProvider: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler.POST(
    new Request("http://localhost/api/admin/ai/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "" }),
    }),
  )
  assert.equal(res.status, 400)
})

test("admin ai provider detail patch returns 200", async () => {
  const handler = createAdminAIProviderDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIProviderDetail: async () => sampleProviderDetail,
    updateAdminAIProvider: async () => sampleProviderDetail,
  })

  const res = await handler.PATCH(
    new Request("http://localhost/api/admin/ai/providers/550e8400-e29b-41d4-a716-446655440101", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "siliconflow",
        name: "SiliconFlow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
        authMode: "bearer",
        keepExistingSecret: true,
        supportsStream: true,
        supportsJsonMode: false,
        timeoutMs: 60000,
        retryCount: 1,
        isActive: true,
        metadata: {},
        changeReason: "调整元数据",
      }),
    }),
    { params: Promise.resolve({ providerId: "550e8400-e29b-41d4-a716-446655440101" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai provider detail get accepts provider code route id", async () => {
  let receivedProviderId: string | null = null

  const handler = createAdminAIProviderDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIProviderDetail: async (_adminId, providerId) => {
      receivedProviderId = providerId
      return sampleProviderDetail
    },
    updateAdminAIProvider: async () => sampleProviderDetail,
  })

  const res = await handler.GET(
    new Request("http://localhost/api/admin/ai/providers/siliconflow"),
    { params: Promise.resolve({ providerId: "siliconflow" }) },
  )

  assert.equal(res.status, 200)
  assert.equal(receivedProviderId, "siliconflow")
})

test("admin ai provider secret reveal returns 200", async () => {
  const handler = createAdminAIProviderSecretRevealPostHandler({
    getRequestAdmin: async () => okAdmin,
    revealAdminAIProviderSecret: async () => ({
      apiKey: "sk-live-demo-secret",
      source: "database",
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/providers/550e8400-e29b-41d4-a716-446655440101/reveal-secret", {
      method: "POST",
    }),
    { params: Promise.resolve({ providerId: "550e8400-e29b-41d4-a716-446655440101" }) },
  )

  assert.equal(res.status, 200)
})

test("admin ai model list returns 200", async () => {
  const handler = createAdminAIModelListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIModelList: async () => sampleModelList,
    createAdminAIModel: async () => sampleModelDetail,
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/models"))
  assert.equal(res.status, 200)
})

test("admin ai model detail get returns 200", async () => {
  const handler = createAdminAIModelDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIModelDetail: async () => sampleModelDetail,
    updateAdminAIModel: async () => sampleModelDetail,
  })

  const res = await handler.GET(
    new Request("http://localhost/api/admin/ai/models/550e8400-e29b-41d4-a716-446655440102"),
    { params: Promise.resolve({ modelId: "550e8400-e29b-41d4-a716-446655440102" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai model detail get accepts UUID with version digit outside 1-5", async () => {
  const handler = createAdminAIModelDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIModelDetail: async () => sampleModelDetail,
    updateAdminAIModel: async () => sampleModelDetail,
  })

  const id = "018e1234-5678-7abc-8def-0123456789ab"
  const res = await handler.GET(new Request(`http://localhost/api/admin/ai/models/${id}`), {
    params: Promise.resolve({ modelId: id }),
  })
  assert.equal(res.status, 200)
})

test("admin ai model detail get accepts model code as route id", async () => {
  const handler = createAdminAIModelDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIModelDetail: async () => sampleModelDetail,
    updateAdminAIModel: async () => sampleModelDetail,
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/models/claude-3-5-sonnet"), {
    params: Promise.resolve({ modelId: "claude-3-5-sonnet" }),
  })
  assert.equal(res.status, 200)
})

test("admin ai agent list returns 200", async () => {
  const handler = createAdminAIAgentListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIAgentList: async () => sampleAgentList,
    createAdminAIAgent: async () => sampleAgentDetail,
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/agents"))
  assert.equal(res.status, 200)
})

test("admin ai agent detail patch returns 200", async () => {
  const handler = createAdminAIAgentDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminAIAgentDetail: async () => sampleAgentDetail,
    updateAdminAIAgent: async () => sampleAgentDetail,
  })

  const res = await handler.PATCH(
    new Request("http://localhost/api/admin/ai/agents/550e8400-e29b-41d4-a716-446655440103", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "codex-cli-coach",
        name: "Codex CLI 工作流教练",
        scenarioType: "teaching",
        description: "CLI 工具工作流主教练",
        systemPromptTemplate: "你是 Codex CLI 工作流教练。",
        developerPromptTemplate: "优先拆解当前一步。",
        defaultProviderCode: "siliconflow",
        defaultModelCode: "deepseek-v3-2",
        contextMessageLimit: 8,
        maxOutputTokens: 2600,
        temperature: 0.2,
        topP: 0.8,
        streamEnabled: true,
        isActive: true,
        metadata: {},
        changeReason: "微调 prompt",
      }),
    }),
    { params: Promise.resolve({ agentId: "550e8400-e29b-41d4-a716-446655440103" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai agent binding list returns 200", async () => {
  const handler = createAdminAIAgentBindingListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIAgentBindingList: async () => ({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
    createAdminAIAgentBinding: async () => ({
      bindingId: "550e8400-e29b-41d4-a716-446655440114",
      agentCode: "codex-cli-coach",
      agentName: "Codex CLI 工作流教练",
      toolId: null,
      toolCode: null,
      toolName: null,
      learningLevel: null,
      selectionMode: null,
      pathId: null,
      pathCode: null,
      pathName: null,
      stepNo: null,
      interactionType: "teaching",
      priority: 20,
      isActive: true,
      metadata: {},
      createdAt: "2026-04-05T10:00:00.000Z",
      updatedAt: "2026-04-05T10:00:00.000Z",
    }),
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/agent-bindings"))
  assert.equal(res.status, 200)
})

test("admin ai agent binding detail patch returns 200", async () => {
  const handler = createAdminAIAgentBindingDetailPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminAIAgentBinding: async () => ({
      bindingId: "550e8400-e29b-41d4-a716-446655440114",
      agentCode: "codex-cli-coach",
      agentName: "Codex CLI 工作流教练",
      toolId: null,
      toolCode: null,
      toolName: null,
      learningLevel: null,
      selectionMode: null,
      pathId: null,
      pathCode: null,
      pathName: null,
      stepNo: null,
      interactionType: "teaching",
      priority: 20,
      isActive: true,
      metadata: {},
      createdAt: "2026-04-05T10:00:00.000Z",
      updatedAt: "2026-04-05T10:00:00.000Z",
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/agent-bindings/550e8400-e29b-41d4-a716-446655440114", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentCode: "codex-cli-coach",
        toolId: null,
        learningLevel: null,
        selectionMode: null,
        pathId: null,
        stepNo: null,
        interactionType: "teaching",
        priority: 20,
        isActive: true,
        metadata: {},
        changeReason: "调整排序",
      }),
    }),
    { params: Promise.resolve({ bindingId: "550e8400-e29b-41d4-a716-446655440114" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai skill list returns 200", async () => {
  const handler = createAdminAISkillListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAISkillList: async () => sampleSkillList,
  })

  const res = await handler(new Request("http://localhost/api/admin/ai/skills"))
  assert.equal(res.status, 200)
})

test("admin ai agent skill binding list returns 200", async () => {
  const handler = createAdminAIAgentSkillBindingListHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIAgentSkillBindingList: async () => sampleAgentSkillBindingList,
    createAdminAIAgentSkillBinding: async () => sampleAgentSkillBindingList.items[0],
  })

  const res = await handler.GET(new Request("http://localhost/api/admin/ai/agent-skill-bindings"))
  assert.equal(res.status, 200)
})

test("admin ai agent skill binding detail patch returns 200", async () => {
  const handler = createAdminAIAgentSkillBindingDetailPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminAIAgentSkillBinding: async () => sampleAgentSkillBindingList.items[0],
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/agent-skill-bindings/550e8400-e29b-41d4-a716-446655440105", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentCode: "codex-cli-coach",
        skillCode: "codex-cli-basics-skill",
        priority: 10,
        isRequired: true,
        contextBudgetTokens: 900,
        isActive: true,
        metadata: {},
        changeReason: "调整技能预算",
      }),
    }),
    { params: Promise.resolve({ bindingId: "550e8400-e29b-41d4-a716-446655440105" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai invocation list returns 200", async () => {
  const handler = createAdminAIInvocationListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIInvocationList: async () => sampleInvocationList,
  })

  const res = await handler(new Request("http://localhost/api/admin/ai/invocations"))
  assert.equal(res.status, 200)
})

test("admin ai invocation detail returns 200", async () => {
  const handler = createAdminAIInvocationDetailGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIInvocationDetail: async () => sampleInvocationDetail,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/invocations/550e8400-e29b-41d4-a716-446655440106"),
    { params: Promise.resolve({ invocationId: "550e8400-e29b-41d4-a716-446655440106" }) },
  )
  assert.equal(res.status, 200)
})

test("admin ai resolve preview returns 200", async () => {
  const handler = createAdminAIResolvePreviewPostHandler({
    getRequestAdmin: async () => okAdmin,
    resolveAdminAIPreview: async () => samplePreview,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/resolve-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interactionType: "teaching",
        toolId: null,
        learningLevel: null,
        selectionMode: null,
        pathId: null,
        stepNo: null,
      }),
    }),
  )
  assert.equal(res.status, 200)
})

test("admin ai test route returns 200", async () => {
  const handler = createAdminAITestPostHandler({
    getRequestAdmin: async () => okAdmin,
    executeAdminAITest: async () => sampleTestResult,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/ai/agent/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentCode: "codex-cli-coach",
        providerCode: "siliconflow",
        modelCode: "deepseek-v3-2",
        prompt: "帮我规划一个最小 CLI 练习",
        stream: false,
        changeReason: "联调验证",
      }),
    }),
  )
  assert.equal(res.status, 200)
})
