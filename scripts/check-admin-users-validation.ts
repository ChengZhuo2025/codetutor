import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminUserListQuery,
  parseAdminUserPatchBody,
  parseAdminUserSoftDeleteBody,
} from "../server/lib/request-validation.ts"

test("parseAdminUserListQuery applies defaults", () => {
  const r = parseAdminUserListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.accountStatus, "active")
    assert.equal(r.data.limit, 50)
    assert.equal(r.data.page, 1)
  }
})

test("parseAdminUserListQuery rejects invalid limit", () => {
  const r = parseAdminUserListQuery(new URLSearchParams([["limit", "0"]]))
  assert.equal(r.ok, false)
})

test("parseAdminUserPatchBody rejects empty object", () => {
  const r = parseAdminUserPatchBody({})
  assert.equal(r.ok, false)
})

test("parseAdminUserPatchBody accepts partial update", () => {
  const r = parseAdminUserPatchBody({ nickname: "  hello  " })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.nickname, "hello")
  }
})

test("parseAdminUserSoftDeleteBody accepts empty body", () => {
  const r = parseAdminUserSoftDeleteBody({})
  assert.equal(r.ok, true)
})
