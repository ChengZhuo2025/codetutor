import test from "node:test"
import assert from "node:assert/strict"

import {
  buildTaskScoreLedgerEntry,
  deriveRankSnapshot,
} from "../server/modules/gamification/logic.ts"

test("deriveRankSnapshot resolves current and next rank metadata from score", () => {
  assert.deepEqual(deriveRankSnapshot(0), {
    rankCode: "rookie",
    nextRankCode: "apprentice",
    scoreToNextRank: 200,
  })

  assert.deepEqual(deriveRankSnapshot(200), {
    rankCode: "apprentice",
    nextRankCode: "vibe_coder",
    scoreToNextRank: 300,
  })

  assert.deepEqual(deriveRankSnapshot(2500), {
    rankCode: "master",
    nextRankCode: null,
    scoreToNextRank: 0,
  })
})

test("buildTaskScoreLedgerEntry produces an idempotent task completion ledger payload", () => {
  assert.deepEqual(
    buildTaskScoreLedgerEntry({
      userId: "user-1",
      taskId: "task-1",
      scoreDelta: 80,
      sourceRef: "path-1",
      remark: "Completed task",
    }),
    {
      user_id: "user-1",
      task_id: "task-1",
      event_type: "task_completion",
      score_delta: 80,
      idempotency_key: "task-complete:task-1",
      source_ref: "path-1",
      remark: "Completed task",
    },
  )
})
