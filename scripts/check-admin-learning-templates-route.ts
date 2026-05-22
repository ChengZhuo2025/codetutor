import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminLearningTemplateDetailHandlers,
  createAdminLearningTemplateGeneratePostHandler,
  createAdminLearningTemplateListHandlers,
  createAdminLearningTemplateSyncPostHandler,
} from "../server/modules/admin-learning-templates/route-handler.ts"
import type {
  AdminLearningTemplateDetailResponseData,
  AdminLearningTemplateListResponseData,
  AdminLearningTemplateSyncResponseData,
} from "../lib/api/contracts/admin-learning-templates.ts"

const okAdmin = { ok: true as const, adminId: "admin-uuid-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleDetail: AdminLearningTemplateDetailResponseData = {
  template: {
    templateId: "550e8400-e29b-41d4-a716-446655440900",
    toolCode: "codex",
    toolName: "Codex CLI",
    learningLevel: "intermediate",
    learningLevelLabel: "进阶",
    code: "path-codex-intermediate-self-study",
    name: "Codex CLI 自学模板",
    description: "自学初始化模板",
    stageCount: 1,
    isActive: true,
    syncablePathCount: 0,
    preview: ["整理材料"],
    agentCode: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
  },
  steps: [
    {
      stepId: "550e8400-e29b-41d4-a716-446655440901",
      stepNo: 1,
      title: "整理学习材料",
      summary: "整理材料",
      focus: null,
      goal: "明确目标",
      completionCriteria: "提交目标",
      reviewSummary: null,
      estimatedMinutes: 20,
      rewardScore: 10,
      knowledgePoints: [],
      keyPoints: [],
      pitfalls: [],
      lessonBrief: null,
      practiceSteps: [],
      submissionGuide: null,
      checkpoints: [],
    },
  ],
}

const sampleList: AdminLearningTemplateListResponseData = {
  items: [sampleDetail.template],
  total: 1,
  page: 1,
  limit: 20,
  toolOptions: [{ code: "codex", name: "Codex CLI" }],
}

const validBody = {
  toolCode: "codex",
  learningLevel: "intermediate",
  name: "Codex CLI 自学模板",
  description: "自学初始化模板说明",
  preview: ["整理材料"],
  isActive: true,
  steps: [
    {
      title: "整理学习材料",
      summary: "整理材料",
      goal: "明确目标",
      rewardScore: 10,
    },
  ],
  changeReason: "更新模板",
}

test("template list handler parses filters and requires admin", async () => {
  let capturedStatus = ""
  const handlers = createAdminLearningTemplateListHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningTemplateList: async (filters) => {
      capturedStatus = filters.status
      return sampleList
    },
    createAdminLearningTemplate: async () => sampleDetail,
  })

  const response = await handlers.GET(new Request("https://example.test/api/admin/learning/templates?status=active"))
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.code, "OK")
  assert.equal(capturedStatus, "active")

  const forbiddenHandlers = createAdminLearningTemplateListHandlers({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminLearningTemplateList: async () => sampleList,
    createAdminLearningTemplate: async () => sampleDetail,
  })
  const forbidden = await forbiddenHandlers.GET(new Request("https://example.test/api/admin/learning/templates"))
  assert.equal(forbidden.status, 403)
})

test("template create handler validates body", async () => {
  const handlers = createAdminLearningTemplateListHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningTemplateList: async () => sampleList,
    createAdminLearningTemplate: async () => sampleDetail,
  })

  const response = await handlers.POST(new Request("https://example.test/api/admin/learning/templates", {
    method: "POST",
    body: JSON.stringify(validBody),
  }))
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.code, "OK")

  const invalid = await handlers.POST(new Request("https://example.test/api/admin/learning/templates", {
    method: "POST",
    body: JSON.stringify({ ...validBody, learningLevel: "unknown" }),
  }))
  assert.equal(invalid.status, 400)
})

test("template detail patch maps conflicts", async () => {
  const handlers = createAdminLearningTemplateDetailHandlers({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningTemplateDetail: async () => sampleDetail,
    updateAdminLearningTemplate: async () => {
      const error = new Error("同一工具和水平下已存在启用的自学模板。")
      error.name = "CONFLICT"
      throw error
    },
  })

  const response = await handlers.PATCH(new Request("https://example.test/api/admin/learning/templates/550e8400-e29b-41d4-a716-446655440900", {
    method: "PATCH",
    body: JSON.stringify(validBody),
  }), {
    params: Promise.resolve({ templateId: "550e8400-e29b-41d4-a716-446655440900" }),
  })

  assert.equal(response.status, 409)
})

test("generate and sync handlers return OK payloads", async () => {
  const generateHandler = createAdminLearningTemplateGeneratePostHandler({
    getRequestAdmin: async () => okAdmin,
    generateAdminLearningTemplate: async () => ({
      generated: {
        name: "Codex CLI 自学模板",
        description: "自学初始化模板",
        preview: ["整理材料"],
        steps: sampleDetail.steps,
      },
      agentCode: "self-study-template-planner",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      invocationId: null,
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
    }),
  })
  const generateResponse = await generateHandler(new Request("https://example.test/api/admin/learning/templates/generate", {
    method: "POST",
    body: JSON.stringify({ toolCode: "codex", learningLevel: "intermediate" }),
  }))
  assert.equal(generateResponse.status, 200)

  const syncPayload: AdminLearningTemplateSyncResponseData = {
    templateId: "550e8400-e29b-41d4-a716-446655440900",
    matchedPathCount: 1,
    syncedPathCount: 1,
    skippedPathCount: 0,
  }
  const syncHandler = createAdminLearningTemplateSyncPostHandler({
    getRequestAdmin: async () => okAdmin,
    syncUnstartedAdminLearningTemplate: async () => syncPayload,
  })
  const syncResponse = await syncHandler(new Request("https://example.test/api/admin/learning/templates/550e8400-e29b-41d4-a716-446655440900/sync-unstarted", {
    method: "POST",
  }), {
    params: Promise.resolve({ templateId: "550e8400-e29b-41d4-a716-446655440900" }),
  })
  assert.equal(syncResponse.status, 200)
})

test("template scoped generate handler validates template id and existence", async () => {
  let loadedTemplateId = ""
  const generateHandler = createAdminLearningTemplateGeneratePostHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningTemplateDetail: async (templateId) => {
      loadedTemplateId = templateId
      return sampleDetail
    },
    generateAdminLearningTemplate: async () => ({
      generated: {
        name: "Codex CLI 自学模板",
        description: "自学初始化模板",
        preview: ["整理材料"],
        steps: sampleDetail.steps,
      },
      agentCode: "self-study-template-planner",
      providerCode: "siliconflow",
      modelCode: "deepseek-v3-2",
      invocationId: null,
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
    }),
  })

  const response = await generateHandler(new Request("https://example.test/api/admin/learning/templates/550e8400-e29b-41d4-a716-446655440900/generate", {
    method: "POST",
    body: JSON.stringify({ toolCode: "codex", learningLevel: "intermediate" }),
  }), {
    params: Promise.resolve({ templateId: "550e8400-e29b-41d4-a716-446655440900" }),
  })

  assert.equal(response.status, 200)
  assert.equal(loadedTemplateId, "550e8400-e29b-41d4-a716-446655440900")

  const missingHandler = createAdminLearningTemplateGeneratePostHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningTemplateDetail: async () => null,
    generateAdminLearningTemplate: async () => {
      throw new Error("should not generate for missing template")
    },
  })
  const missing = await missingHandler(new Request("https://example.test/api/admin/learning/templates/550e8400-e29b-41d4-a716-446655440900/generate", {
    method: "POST",
    body: JSON.stringify({ toolCode: "codex", learningLevel: "intermediate" }),
  }), {
    params: Promise.resolve({ templateId: "550e8400-e29b-41d4-a716-446655440900" }),
  })
  assert.equal(missing.status, 404)
})
