import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminSettingsOverviewGetHandler,
  createAdminSettingsAccountListGetHandler,
  createAdminSettingsAccountStatusPostHandler,
  createAdminSettingsAuditLogListGetHandler,
} from "../server/modules/admin-settings/route-handler.ts"
import type {
  AdminSettingsOverviewResponseData,
  AdminSettingsAdminAccountListResponseData,
  AdminSettingsAuditLogListResponseData,
  AdminUpdateAdminAccountStatusResponseData,
} from "../lib/api/contracts/admin-settings.ts"

const okAdmin = { ok: true as const, adminId: "admin-uuid-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleOverview: AdminSettingsOverviewResponseData = {
  currentAdmin: {
    adminAccountId: "550e8400-e29b-41d4-a716-446655440011",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    displayName: "超级管理员",
    avatarUrl: null,
    email: "admin@example.com",
    status: "active",
    roles: ["super_admin"],
    lastLoginAt: "2026-04-05T10:00:00.000Z",
  },
  stats: {
    totalAdminAccounts: 4,
    activeAdminAccounts: 3,
    inactiveAdminAccounts: 1,
    suspendedAdminAccounts: 0,
    auditLogCountLast7Days: 12,
  },
  roleDefinitions: [
    {
      code: "super_admin",
      name: "超级管理员",
      description: "拥有全部后台权限。",
      accountCount: 1,
    },
  ],
  systemInfo: {
    appName: "AI编程学习教练管理后台",
    appVersion: "0.1.0",
    environment: "test",
    nextVersion: "16.2.0",
    reactVersion: "19.2.4",
    adminAuthMode: "Supabase Auth + admin_accounts",
    database: "Supabase PostgreSQL",
    storage: "Supabase Storage",
    auth: "Supabase Auth",
  },
}

const sampleAccountList: AdminSettingsAdminAccountListResponseData = {
  items: [
    {
      adminAccountId: "550e8400-e29b-41d4-a716-446655440011",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      displayName: "超级管理员",
      avatarUrl: null,
      email: "admin@example.com",
      roles: ["super_admin"],
      status: "active",
      lastLoginAt: "2026-04-05T10:00:00.000Z",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  stats: {
    totalAdminAccounts: 4,
    activeAdminAccounts: 3,
    inactiveAdminAccounts: 1,
    suspendedAdminAccounts: 0,
  },
}

const sampleAuditList: AdminSettingsAuditLogListResponseData = {
  items: [
    {
      id: "550e8400-e29b-41d4-a716-446655440031",
      action: "admin_account_deactivate",
      targetType: "admin_account",
      targetId: "550e8400-e29b-41d4-a716-446655440011",
      actorAdminAccountId: "550e8400-e29b-41d4-a716-446655440012",
      actorDisplayName: "超级管理员",
      reason: "离职停用",
      createdAt: "2026-04-05T10:30:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

test("admin settings overview returns 403 without admin", async () => {
  const handler = createAdminSettingsOverviewGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminSettingsOverview: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(new Request("http://localhost/api/admin/settings/overview"))
  assert.equal(res.status, 403)
})

test("admin settings overview returns 200 with data", async () => {
  const handler = createAdminSettingsOverviewGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminSettingsOverview: async () => sampleOverview,
  })

  const res = await handler(new Request("http://localhost/api/admin/settings/overview"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.currentAdmin.displayName, "超级管理员")
})

test("admin settings accounts list returns 200", async () => {
  const handler = createAdminSettingsAccountListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminSettingsAdminAccountList: async () => sampleAccountList,
  })

  const res = await handler(new Request("http://localhost/api/admin/settings/admin-accounts"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.items.length, 1)
})

test("admin settings account status route rejects invalid action", async () => {
  const handler = createAdminSettingsAccountStatusPostHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminSettingsAdminAccountStatus: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/settings/admin-accounts/550e8400-e29b-41d4-a716-446655440011/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suspend" }),
    }),
    { params: Promise.resolve({ adminAccountId: "550e8400-e29b-41d4-a716-446655440011" }) },
  )

  assert.equal(res.status, 400)
})

test("admin settings account status route returns 200 on success", async () => {
  const handler = createAdminSettingsAccountStatusPostHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminSettingsAdminAccountStatus: async (): Promise<AdminUpdateAdminAccountStatusResponseData> => ({
      adminAccountId: "550e8400-e29b-41d4-a716-446655440011",
      status: "inactive",
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/settings/admin-accounts/550e8400-e29b-41d4-a716-446655440011/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate", reason: "离职停用" }),
    }),
    { params: Promise.resolve({ adminAccountId: "550e8400-e29b-41d4-a716-446655440011" }) },
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.status, "inactive")
})

test("admin settings audit list returns 200", async () => {
  const handler = createAdminSettingsAuditLogListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminSettingsAuditLogList: async () => sampleAuditList,
  })

  const res = await handler(new Request("http://localhost/api/admin/settings/audit-logs"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.items[0].targetType, "admin_account")
})
