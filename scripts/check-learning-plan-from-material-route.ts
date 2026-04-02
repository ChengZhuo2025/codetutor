import test from "node:test"
import assert from "node:assert/strict"

import {
  createPlanDraftConfirmPostHandler,
  createPlanFromMaterialPostHandler,
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

const previewFixture = {
  title: "计划",
  goal: "目标",
  tasks: [
    {
      taskNo: 1,
      title: "T1",
      objective: "O1",
      practiceSteps: ["a", "b"],
      acceptanceCriteria: "ok",
      sourceRefs: ["c1"],
    },
    {
      taskNo: 2,
      title: "T2",
      objective: "O2",
      practiceSteps: ["a", "b"],
      acceptanceCriteria: "ok",
      sourceRefs: ["c1"],
    },
    {
      taskNo: 3,
      title: "T3",
      objective: "O3",
      practiceSteps: ["a", "b"],
      acceptanceCriteria: "ok",
      sourceRefs: ["c1"],
    },
  ],
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
    createPlanFromMaterial: async () => ({
      processingMode: "sync" as const,
      draftId: "11111111-1111-4111-8111-111111111111",
      intakeId: "22222222-2222-4222-8222-222222222222",
      preview: previewFixture,
    }),
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost/api/learning/plan-from-material",
      JSON.stringify({
        links: ["https://web.dev/learn/"],
      }),
    ),
  )

  assert.equal(response.status, 200)
  const json = (await response.json()) as {
    code: string
    data: { draftId: string }
  }
  assert.equal(json.code, "OK")
  assert.equal(json.data.draftId, "11111111-1111-4111-8111-111111111111")
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
