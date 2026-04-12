import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminLearningPathListQuery,
  parseAdminLearningSessionListQuery,
  parseAdminLearningPathStatusBody,
} from "../server/lib/request-validation.ts"

test("parseAdminLearningPathListQuery applies defaults", () => {
  const r = parseAdminLearningPathListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.page, 1)
    assert.equal(r.data.limit, 20)
    assert.equal(r.data.status, "all")
    assert.equal(r.data.updatedWithin, "all")
  }
})

test("parseAdminLearningPathListQuery accepts structured filters", () => {
  const r = parseAdminLearningPathListQuery(new URLSearchParams([
    ["status", "interrupted"],
    ["toolCode", "cursor"],
    ["learningLevel", "beginner"],
    ["updatedWithin", "30d"],
    ["keyword", "JavaScript"],
    ["page", "2"],
    ["limit", "50"],
  ]))

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      status: "interrupted",
      toolCode: "cursor",
      learningLevel: "beginner",
      updatedWithin: "30d",
      keyword: "JavaScript",
      page: 2,
      limit: 50,
    })
  }
})

test("parseAdminLearningPathListQuery rejects invalid status", () => {
  const r = parseAdminLearningPathListQuery(new URLSearchParams([["status", "archived"]]))
  assert.equal(r.ok, false)
})

test("parseAdminLearningPathStatusBody accepts reactivate action with optional reason", () => {
  const r = parseAdminLearningPathStatusBody({
    action: "reactivate",
    reason: "  用户回访后确认继续学习  ",
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      action: "reactivate",
      reason: "用户回访后确认继续学习",
    })
  }
})

test("parseAdminLearningPathStatusBody rejects invalid action", () => {
  const r = parseAdminLearningPathStatusBody({
    action: "abandon",
  })
  assert.equal(r.ok, false)
})

test("parseAdminLearningSessionListQuery applies defaults", () => {
  const r = parseAdminLearningSessionListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.page, 1)
    assert.equal(r.data.limit, 20)
  }
})

test("parseAdminLearningSessionListQuery accepts pagination", () => {
  const r = parseAdminLearningSessionListQuery(new URLSearchParams([
    ["page", "3"],
    ["limit", "50"],
  ]))

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      page: 3,
      limit: 50,
    })
  }
})

test("parseAdminLearningSessionListQuery rejects invalid limit", () => {
  const r = parseAdminLearningSessionListQuery(new URLSearchParams([["limit", "0"]]))
  assert.equal(r.ok, false)
})
