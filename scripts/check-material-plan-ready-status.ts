import test from "node:test"
import assert from "node:assert/strict"

import { getMaterialIntakeStatusFromClient } from "../server/modules/learning-materials/status.ts"

function createSupabaseMock({
  intake,
  runError,
  expectedPreferredRunId,
}: {
  intake: Record<string, unknown> | null
  runError?: { message: string } | null
  expectedPreferredRunId?: string | null
}) {
  let runQueryCount = 0
  let resumePreferredRunId: string | null | undefined

  const query = {
    select() {
      return this
    },
    eq() {
      return this
    },
    async maybeSingle() {
      return { data: intake, error: null }
    },
  }

  const runQuery = {
    select() {
      return this
    },
    eq() {
      return this
    },
    async maybeSingle() {
      runQueryCount += 1
      return { data: null, error: runError ?? null }
    },
  }

  return {
    client: {
      from(table: string) {
        return table === "learning_plan_generation_runs" ? runQuery : query
      },
    },
    getRunQueryCount() {
      return runQueryCount
    },
    async resumePendingRuns(_limit?: number, preferredRunId?: string | null) {
      resumePreferredRunId = preferredRunId
      if (expectedPreferredRunId !== undefined) {
        assert.equal(preferredRunId, expectedPreferredRunId)
      }
    },
    getResumePreferredRunId() {
      return resumePreferredRunId
    },
  }
}

test("ready material intake status does not depend on latest run lookup", async () => {
  const { client, getRunQueryCount } = createSupabaseMock({
    intake: {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      status: "ready",
      processing_stage: "ready",
      progress_percent: 100,
      progress_message: "草稿已生成，可进入编辑与确认",
      latest_run_id: "22222222-2222-4222-8222-222222222222",
      latest_draft_id: "33333333-3333-4333-8333-333333333333",
      error_code: null,
    },
    runError: { message: "TypeError: fetch failed" },
  })

  const result = await getMaterialIntakeStatusFromClient(
    client as never,
    "user-1",
    "11111111-1111-4111-8111-111111111111",
    async () => {},
  )

  assert.equal(result.status, "ready")
  assert.equal(result.progressPercent, 100)
  assert.equal(result.draftId, "33333333-3333-4333-8333-333333333333")
  assert.equal(result.errorMessage, null)
  assert.equal(getRunQueryCount(), 0)
})

test("active material intake status resumes its own latest run first", async () => {
  const { client, getResumePreferredRunId, resumePendingRuns } = createSupabaseMock({
    intake: {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      status: "planning",
      processing_stage: "planning",
      progress_percent: 55,
      progress_message: "正在生成学习计划草稿",
      latest_run_id: "22222222-2222-4222-8222-222222222222",
      latest_draft_id: null,
      error_code: null,
    },
    expectedPreferredRunId: "22222222-2222-4222-8222-222222222222",
  })

  await getMaterialIntakeStatusFromClient(
    client as never,
    "user-1",
    "11111111-1111-4111-8111-111111111111",
    resumePendingRuns,
  )

  assert.equal(getResumePreferredRunId(), "22222222-2222-4222-8222-222222222222")
})

test("active material intake status ignores transient resume failures", async () => {
  const { client } = createSupabaseMock({
    intake: {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      status: "planning",
      processing_stage: "planning",
      progress_percent: 55,
      progress_message: "正在生成学习计划草稿",
      latest_run_id: "22222222-2222-4222-8222-222222222222",
      latest_draft_id: null,
      error_code: null,
    },
  })
  const originalWarn = console.warn
  console.warn = () => {}

  try {
    const result = await getMaterialIntakeStatusFromClient(
      client as never,
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      async () => {
        throw new TypeError("fetch failed")
      },
    )

    assert.equal(result.status, "planning")
    assert.equal(result.progressPercent, 55)
    assert.equal(result.runId, "22222222-2222-4222-8222-222222222222")
  } finally {
    console.warn = originalWarn
  }
})
