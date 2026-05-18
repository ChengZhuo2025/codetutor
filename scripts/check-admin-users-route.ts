import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminUserDetailGetHandler,
  createAdminUserExportGetHandler,
  createAdminUserListGetHandler,
  createAdminUserPatchHandler,
  createAdminUserRestorePostHandler,
  createAdminUserSoftDeletePostHandler,
} from "../server/modules/admin-users/route-handler.ts"
import type { AdminUserDetailResponseData } from "../lib/api/contracts/admin-users.ts"
import type { RestoreAdminUserResult } from "../server/modules/admin-users/service.ts"

const okAdmin = { ok: true as const, adminId: "admin-uuid-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleUser: AdminUserDetailResponseData = {
  userId: "550e8400-e29b-41d4-a716-446655440001",
  nickname: "U",
  avatarUrl: null,
  wechat: null,
  oauthWechatLinked: true,
  oauthDouyinLinked: false,
  oauthLinkedProviders: ["wechat"],
  contactEmail: null,
  bio: null,
  signupProvider: null,
  lastLoginProvider: null,
  lastLoginAt: null,
  lastLoginIp: null,
  lastLoginCity: null,
  authPhone: null,
  authEmail: null,
  onboardingCompleted: true,
  contentLanguage: "zh-CN",
  primaryToolCode: null,
  primaryToolName: null,
  activePathStatus: null,
  activePathSelectionMode: null,
  activePathLearningLevel: null,
  activePathCode: null,
  activePathName: null,
  activePathStartedAt: null,
  activePathLastActivityAt: null,
  activePathTotalSteps: null,
  activePathCompletedSteps: null,
  activePathCompletionPercent: null,
  activePathCompletedTaskCount: 0,
  activePathInProgressTaskCount: 0,
  activePathPendingTaskCount: 0,
  activePathBlockedTaskCount: 0,
  completedTaskCountTotal: 0,
  inProgressTaskCountTotal: 0,
  pendingTaskCountTotal: 0,
  blockedTaskCountTotal: 0,
  currentScore: 0,
  currentRankCode: "rookie",
  streakDays: 0,
  lastLearningAt: null,
  profileCreatedAt: null,
  profileUpdatedAt: null,
  deletedAt: null,
  deletedReason: null,
}

test("admin user list returns 403 without admin", async () => {
  const handler = createAdminUserListGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminUserList: async () => {
      throw new Error("should not call")
    },
  })
  const res = await handler(new Request("http://localhost/api/admin/users"))
  assert.equal(res.status, 403)
})

test("admin user list returns 200 with mock data", async () => {
  const handler = createAdminUserListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminUserList: async () => ({
      items: [sampleUser],
      total: 1,
      page: 1,
      limit: 20,
      stats: {
        totalUsers: 10,
        activePlanUsers: 6,
        streakingUsers: 4,
        deletedUsers: 1,
      },
    }),
  })
  const res = await handler(new Request("http://localhost/api/admin/users"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.code, "OK")
  assert.equal(body.data.items.length, 1)
  assert.equal(body.data.stats.totalUsers, 10)
})

test("admin user export returns csv", async () => {
  const handler = createAdminUserExportGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminUsersExportCsv: async () => ({ csv: "\uFEFFh\nv", filename: "x.csv" }),
  })
  const res = await handler(new Request("http://localhost/api/admin/users/export"))
  assert.equal(res.status, 200)
  assert.ok(res.headers.get("Content-Type")?.includes("text/csv"))
})

test("admin user export returns 413 when limit exceeded", async () => {
  const handler = createAdminUserExportGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminUsersExportCsv: async () => {
      throw new Error("USER_EXPORT_LIMIT_EXCEEDED")
    },
  })
  const res = await handler(new Request("http://localhost/api/admin/users/export"))
  assert.equal(res.status, 413)
})

test("admin user detail returns 404 when missing", async () => {
  const handler = createAdminUserDetailGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminUserDetail: async () => null,
  })
  const res = await handler(
    new Request("http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001"),
    { params: Promise.resolve({ userId: "550e8400-e29b-41d4-a716-446655440001" }) },
  )
  assert.equal(res.status, 404)
})

test("admin user patch returns 400 for empty body", async () => {
  const handler = createAdminUserPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminUser: async () => sampleUser,
  })
  const res = await handler(
    new Request("http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ userId: "550e8400-e29b-41d4-a716-446655440001" }) },
  )
  assert.equal(res.status, 400)
})

test("admin user restore returns 409 when not soft-deleted", async () => {
  const handler = createAdminUserRestorePostHandler({
    getRequestAdmin: async () => okAdmin,
    restoreAdminUser: async (): Promise<RestoreAdminUserResult> => "not_soft_deleted",
  })
  const res = await handler(
    new Request("http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001/restore", {
      method: "POST",
    }),
    { params: Promise.resolve({ userId: "550e8400-e29b-41d4-a716-446655440001" }) },
  )
  assert.equal(res.status, 409)
})

test("admin user soft-delete returns 200", async () => {
  const handler = createAdminUserSoftDeletePostHandler({
    getRequestAdmin: async () => okAdmin,
    softDeleteAdminUser: async () => ({ ...sampleUser, deletedAt: "2026-01-01T00:00:00.000Z" }),
  })
  const res = await handler(
    new Request("http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001/soft-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "spam" }),
    }),
    { params: Promise.resolve({ userId: "550e8400-e29b-41d4-a716-446655440001" }) },
  )
  assert.equal(res.status, 200)
})

test("admin user soft-delete returns 409 for admin-linked user", async () => {
  const handler = createAdminUserSoftDeletePostHandler({
    getRequestAdmin: async () => okAdmin,
    softDeleteAdminUser: async () => {
      const error = new Error("管理员关联的用户档案不允许软删除。")
      error.name = "CONFLICT"
      throw error
    },
  })
  const res = await handler(
    new Request("http://localhost/api/admin/users/550e8400-e29b-41d4-a716-446655440001/soft-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "spam" }),
    }),
    { params: Promise.resolve({ userId: "550e8400-e29b-41d4-a716-446655440001" }) },
  )
  assert.equal(res.status, 409)
  assert.deepEqual(await res.json(), {
    code: "CONFLICT",
    message: "管理员关联的用户档案不允许软删除。",
    data: null,
  })
})
