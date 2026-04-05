import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminSettingsAccountListQuery,
  parseAdminSettingsAuditListQuery,
  parseAdminSettingsAccountStatusBody,
} from "../server/lib/request-validation.ts"

test("parseAdminSettingsAccountListQuery applies defaults", () => {
  const r = parseAdminSettingsAccountListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.status, "all")
    assert.equal(r.data.limit, 20)
    assert.equal(r.data.page, 1)
  }
})

test("parseAdminSettingsAccountListQuery accepts keyword and status", () => {
  const r = parseAdminSettingsAccountListQuery(new URLSearchParams([
    ["keyword", "ops"],
    ["status", "inactive"],
    ["limit", "50"],
    ["page", "2"],
  ]))

  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      keyword: "ops",
      status: "inactive",
      limit: 50,
      page: 2,
    })
  }
})

test("parseAdminSettingsAuditListQuery applies defaults", () => {
  const r = parseAdminSettingsAuditListQuery(new URLSearchParams())
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.data.action, "all")
    assert.equal(r.data.targetType, "all")
    assert.equal(r.data.limit, 20)
    assert.equal(r.data.page, 1)
  }
})

test("parseAdminSettingsAccountStatusBody trims reason", () => {
  const r = parseAdminSettingsAccountStatusBody({
    action: "deactivate",
    reason: "  离职停用  ",
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.data, {
      action: "deactivate",
      reason: "离职停用",
    })
  }
})

test("parseAdminSettingsAccountStatusBody rejects invalid action", () => {
  const r = parseAdminSettingsAccountStatusBody({ action: "suspend" })
  assert.equal(r.ok, false)
})
