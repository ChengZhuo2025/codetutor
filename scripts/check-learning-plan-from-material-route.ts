import test from "node:test"
import assert from "node:assert/strict"

import { MaterialPlanError } from "../server/modules/learning-materials/errors.ts"
import { LearningPlanServiceError } from "../server/modules/learning-plans/errors.ts"
import {
  createPlanDraftDetailHandler,
  createPlanDraftConfirmPostHandler,
  createPlanDraftRegeneratePostHandler,
  createPlanFromMaterialPostHandler,
  createPlanDraftTaskRegeneratePostHandler,
} from "../server/modules/learning-plans/route-handler.ts"

function createJsonRequest(url: string, body: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }) as never
}

test("plan-from-material returns 401 when unauthenticated", async () => {
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录。",
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://web.dev/learn/"],
      }),
    ),
  )

  assert.equal(response.status, 401)
})

test("plan-from-material returns 422 for invalid json body", async () => {
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
  })

  const response = await handler(
    createJsonRequest("http://localhost/api/learning/plan-from-material", "{"),
  )

  assert.equal(response.status, 422)
})

test("plan-from-material returns 200 with injected service", async () => {
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    assertCanUseMaterialPlan: async () => {},
    createPlanFromMaterial: async () => ({
      processingMode: "async" as const,
      intakeId: "22222222-2222-4222-8222-222222222222",
      runId: "33333333-3333-4333-8333-333333333333",
      draftId: null,
      status: "queued" as const,
    }),
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://web.dev/learn/"],
        currentConstraints: "需要控制在 2 周内完成",
      }),
    ),
  )

  assert.equal(response.status, 200)
  const json = (await response.json()) as {
    code: string
    data: { processingMode: string; runId: string; draftId: string | null }
  }
  assert.equal(json.code, "OK")
  assert.equal(json.data.processingMode, "async")
  assert.equal(json.data.runId, "33333333-3333-4333-8333-333333333333")
  assert.equal(json.data.draftId, null)
})

test("plan-from-material returns structured code when multiple links are provided", async () => {
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://web.dev/learn/", "https://nextjs.org/docs"],
      }),
    ),
  )

  assert.equal(response.status, 422)
  const json = (await response.json()) as { code: string }
  assert.equal(json.code, "MATERIAL_SINGLE_LINK_ONLY")
})

test("plan-from-material checks self-directed eligibility before creating a run", async () => {
  let createCalled = false
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    assertCanUseMaterialPlan: async () => {
      throw new LearningPlanServiceError(
        "SELF_DIRECTED_PLAN_REQUIRED",
        "仅自学模式支持用教程链接生成学习计划。",
        409,
      )
    },
    createPlanFromMaterial: async () => {
      createCalled = true
      return {
        processingMode: "async" as const,
        intakeId: "22222222-2222-4222-8222-222222222222",
        runId: "33333333-3333-4333-8333-333333333333",
        draftId: null,
        status: "queued" as const,
      }
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://web.dev/learn/"],
      }),
    ),
  )

  assert.equal(response.status, 409)
  assert.equal(createCalled, false)
  const json = (await response.json()) as { code: string }
  assert.equal(json.code, "SELF_DIRECTED_PLAN_REQUIRED")
})

test("plan-from-material preserves friendly material fetch guidance", async () => {
  const handler = createPlanFromMaterialPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    assertCanUseMaterialPlan: async () => {},
    createPlanFromMaterial: async () => {
      throw new MaterialPlanError(
        "MATERIAL_FETCH_FAILED",
        "抖音链接未返回可公开访问的详情内容。请打开单条公开视频详情页后复制链接重试；若页面需要登录、仅粉丝可见或已下线，当前无法生成学习计划。",
        422,
      )
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://www.douyin.com/video/7621128300018158911"],
      }),
    ),
  )

  assert.equal(response.status, 422)
  const json = (await response.json()) as { code: string; message: string }
  assert.equal(json.code, "MATERIAL_FETCH_FAILED")
  assert.match(json.message, /单条公开视频详情页|需要登录|仅粉丝可见/)
})

test("plan-draft confirm returns 400 for invalid draft id", async () => {
  const handler = createPlanDraftConfirmPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
  })

  const response = await handler(createJsonRequest("http://x", "{}"), {
    params: Promise.resolve({ id: "not-a-uuid" }),
  })

  assert.equal(response.status, 400)
})

test("plan-draft confirm returns 200 with injected service", async () => {
  const handler = createPlanDraftConfirmPostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    confirmPlanDraftForUser: async () => ({
      learningPathId: "p1",
      currentTaskId: "t1",
      redirectTo: "/learn",
    }),
  })

  const response = await handler(createJsonRequest("http://x", "{}"), {
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
  })
  assert.equal(response.status, 200)
  const json = (await response.json()) as { data: { currentTaskId: string } }
  assert.equal(json.data.currentTaskId, "t1")
})

test("plan-draft detail get returns 200 with injected service", async () => {
  const handlers = createPlanDraftDetailHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    getPlanDraftDetailForUser: async () => ({
      draftId: "11111111-1111-4111-8111-111111111111",
      intakeId: "22222222-2222-4222-8222-222222222222",
      inputContext: {
        links: ["https://web.dev/learn/"],
        userGoal: "目标",
        weeklyHours: 6,
        currentConstraints: "两周内完成",
      },
      title: "草稿",
      goal: "目标",
      status: "draft",
      revisionNo: 2,
      qualityStatus: "pending",
      qualityReport: null,
      alignmentTable: [],
      week1TaskIds: [],
      updatedAt: "2026-04-08T00:00:00.000Z",
      tasks: [],
    }),
  })

  const response = await handlers.GET(new Request("http://x") as never, {
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
  })

  assert.equal(response.status, 200)
})

test("plan-draft detail patch returns 200 with injected service", async () => {
  const handlers = createPlanDraftDetailHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    updatePlanDraftForUser: async () => ({
      draftId: "11111111-1111-4111-8111-111111111111",
      intakeId: "22222222-2222-4222-8222-222222222222",
      inputContext: {
        links: ["https://web.dev/learn/"],
        userGoal: "新目标",
        weeklyHours: 6,
        currentConstraints: "两周内完成",
      },
      title: "新标题",
      goal: "新目标",
      status: "draft",
      revisionNo: 3,
      qualityStatus: "pending",
      qualityReport: null,
      alignmentTable: [],
      week1TaskIds: [],
      updatedAt: "2026-04-08T00:00:00.000Z",
      tasks: [],
    }),
  })

  const response = await handlers.PATCH(
    createJsonRequest("http://x", JSON.stringify({ title: "新标题" })),
    {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    },
  )

  assert.equal(response.status, 200)
})

test("plan-draft regenerate forwards currentConstraints", async () => {
  let received:
    | {
      links?: string[] | null
      userGoal?: string | null
      weeklyHours?: number | null
      currentConstraints?: string | null
    }
    | null = null

  const handler = createPlanDraftRegeneratePostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    assertCanUseMaterialPlan: async () => {},
    regeneratePlanDraft: async (_userId, _draftId, input) => {
      received = input
      return {
        processingMode: "async" as const,
        intakeId: "22222222-2222-4222-8222-222222222222",
        runId: "33333333-3333-4333-8333-333333333333",
        draftId: null,
        status: "queued" as const,
      }
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://x",
      JSON.stringify({
        currentConstraints: "两周内完成，优先项目实战",
      }),
    ),
    {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    },
  )

  assert.equal(response.status, 200)
  assert.deepEqual(received, {
    links: undefined,
    userGoal: undefined,
    weeklyHours: undefined,
    currentConstraints: "两周内完成，优先项目实战",
  })
})

test("plan-draft task regenerate returns 200 with injected service", async () => {
  const handler = createPlanDraftTaskRegeneratePostHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    regeneratePlanDraftTaskForUser: async () => ({
      draftId: "11111111-1111-4111-8111-111111111111",
      intakeId: "22222222-2222-4222-8222-222222222222",
      inputContext: {
        links: ["https://web.dev/learn/"],
        userGoal: "目标",
        weeklyHours: 6,
        currentConstraints: "两周内完成",
      },
      title: "草稿",
      goal: "目标",
      status: "draft",
      revisionNo: 4,
      qualityStatus: "pending",
      qualityReport: null,
      alignmentTable: [],
      week1TaskIds: [],
      updatedAt: "2026-04-08T00:00:00.000Z",
      tasks: [],
    }),
  })

  const response = await handler(new Request("http://x", { method: "POST" }) as never, {
    params: Promise.resolve({
      id: "11111111-1111-4111-8111-111111111111",
      taskId: "33333333-3333-4333-8333-333333333333",
    }),
  })

  assert.equal(response.status, 200)
})
