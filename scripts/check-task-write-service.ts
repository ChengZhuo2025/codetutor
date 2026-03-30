import test from "node:test"
import assert from "node:assert/strict"

import {
  getRankCodeForScore,
  resolveTaskProgression,
} from "../server/modules/tasks/logic.ts"

test("getRankCodeForScore maps score thresholds to rank codes", () => {
  assert.equal(getRankCodeForScore(0), "rookie")
  assert.equal(getRankCodeForScore(200), "apprentice")
  assert.equal(getRankCodeForScore(999), "vibe_coder")
  assert.equal(getRankCodeForScore(2500), "master")
})

test("resolveTaskProgression advances to the next step when path still has remaining tasks", () => {
  const result = resolveTaskProgression({
    currentTaskId: "task-1",
    totalSteps: 3,
    tasks: [
      { id: "task-1", stepNo: 1, status: "in_progress" },
      { id: "task-2", stepNo: 2, status: "not_started" },
      { id: "task-3", stepNo: 3, status: "not_started" },
    ],
  })

  assert.deepEqual(result, {
    completedSteps: 1,
    nextTaskId: "task-2",
    pathCompleted: false,
  })
})

test("resolveTaskProgression marks the path completed when the final step is finished", () => {
  const result = resolveTaskProgression({
    currentTaskId: "task-3",
    totalSteps: 3,
    tasks: [
      { id: "task-1", stepNo: 1, status: "completed" },
      { id: "task-2", stepNo: 2, status: "completed" },
      { id: "task-3", stepNo: 3, status: "in_progress" },
    ],
  })

  assert.deepEqual(result, {
    completedSteps: 3,
    nextTaskId: null,
    pathCompleted: true,
  })
})
