import test from "node:test"
import assert from "node:assert/strict"

import {
  buildPersistedLearningMessageId,
  normalizeLearningMessagesPageSize,
  resolveLearningMessagesPage,
} from "../server/modules/learning/history-logic.ts"

test("normalizeLearningMessagesPageSize falls back to default and clamps oversized input", () => {
  assert.equal(normalizeLearningMessagesPageSize(undefined), 20)
  assert.equal(normalizeLearningMessagesPageSize(0), 20)
  assert.equal(normalizeLearningMessagesPageSize(8), 8)
  assert.equal(normalizeLearningMessagesPageSize(200), 50)
})

test("resolveLearningMessagesPage converts desc rows to asc page items and returns next cursor", () => {
  const page = resolveLearningMessagesPage(
    [
      { sequenceNo: 9, label: "m9" },
      { sequenceNo: 8, label: "m8" },
      { sequenceNo: 7, label: "m7" },
      { sequenceNo: 6, label: "m6" },
    ],
    3,
  )

  assert.deepEqual(page.items, [
    { sequenceNo: 7, label: "m7" },
    { sequenceNo: 8, label: "m8" },
    { sequenceNo: 9, label: "m9" },
  ])
  assert.equal(page.hasMore, true)
  assert.equal(page.nextBeforeSequenceNo, 7)
})

test("resolveLearningMessagesPage returns no cursor when the current page already reaches the beginning", () => {
  const page = resolveLearningMessagesPage(
    [
      { sequenceNo: 4, label: "m4" },
      { sequenceNo: 3, label: "m3" },
    ],
    3,
  )

  assert.deepEqual(page.items, [
    { sequenceNo: 3, label: "m3" },
    { sequenceNo: 4, label: "m4" },
  ])
  assert.equal(page.hasMore, false)
  assert.equal(page.nextBeforeSequenceNo, null)
})

test("buildPersistedLearningMessageId keeps persisted conversation messages away from static seed ids", () => {
  assert.equal(buildPersistedLearningMessageId(1), 1001)
  assert.equal(buildPersistedLearningMessageId(32), 1032)
})
