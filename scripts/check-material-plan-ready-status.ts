import test from "node:test"
import assert from "node:assert/strict"

import { getMaterialIntakeStatusFromClient } from "../server/modules/learning-materials/status.ts"

function createSupabaseMock({
  intake,
  runError,
}: {
  intake: Record<string, unknown> | null
  runError?: { message: string } | null
}) {
  let runQueryCount = 0

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
