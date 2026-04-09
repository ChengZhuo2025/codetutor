import test from "node:test"
import assert from "node:assert/strict"

import { createMaterialIntakeStatusGetHandler } from "../server/modules/learning-plans/route-handler.ts"

test("material-intake status returns 401 when unauthenticated", async () => {
  const handler = createMaterialIntakeStatusGetHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录。",
  })

  const response = await handler(new Request("http://localhost/api/learning/material-intakes/x") as never, {
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
  })

  assert.equal(response.status, 401)
})

test("material-intake status returns 400 for invalid intake id", async () => {
  const handler = createMaterialIntakeStatusGetHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
  })

  const response = await handler(new Request("http://localhost/api/learning/material-intakes/x") as never, {
    params: Promise.resolve({ id: "not-a-uuid" }),
  })

  assert.equal(response.status, 400)
})

test("material-intake status returns latest async state from injected service", async () => {
  const handler = createMaterialIntakeStatusGetHandler({
    getRequestAuth: async () => ({ userId: "u1" }),
    getRequestAuthHelpText: () => "",
    getMaterialIntakeStatus: async () => ({
      intakeId: "11111111-1111-4111-8111-111111111111",
      status: "planning" as const,
      processingStage: "planning",
      progressPercent: 65,
      progressMessage: "正在生成学习计划草稿",
      draftId: null,
      runId: "22222222-2222-4222-8222-222222222222",
      errorCode: null,
      errorMessage: null,
    }),
  })

  const response = await handler(new Request("http://localhost/api/learning/material-intakes/x") as never, {
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
  })

  assert.equal(response.status, 200)
  const json = (await response.json()) as {
    code: string
    data: { status: string; progressPercent: number; runId: string }
  }
  assert.equal(json.code, "OK")
  assert.equal(json.data.status, "planning")
  assert.equal(json.data.progressPercent, 65)
  assert.equal(json.data.runId, "22222222-2222-4222-8222-222222222222")
})
