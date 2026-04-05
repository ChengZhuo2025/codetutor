import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminLoginPostHandler,
  createAdminLogoutPostHandler,
  createAdminSessionGetHandler,
} from "../server/modules/admin-auth/route-handler.ts"
import { createAdminDashboardOverviewGetHandler } from "../server/modules/admin-dashboard/route-handler.ts"

function createJsonRequest(url: string, body: string, headers?: HeadersInit) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  }) as never
}

test("admin login route reuses current authorized session when bearer session already exists", async () => {
  const handler = createAdminLoginPostHandler({
    getAdminSessionFromRequest: async () => ({
      adminAccountId: "admin-1",
      userId: "user-1",
      displayName: "Admin",
      avatarUrl: null,
      roles: ["super_admin"],
      status: "active",
    }),
    adminLogin: async () => {
      throw new Error("should not call fallback login when session already exists")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/auth/login",
      JSON.stringify({ email: "admin@example.com", password: "secret" }),
      { Authorization: "Bearer token" },
    ),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    code: "OK",
    message: "登录成功",
    data: {
      adminAccountId: "admin-1",
      userId: "user-1",
      displayName: "Admin",
      avatarUrl: null,
      roles: ["super_admin"],
      status: "active",
    },
  })
})

test("admin login route preserves invalid credential mapping", async () => {
  const handler = createAdminLoginPostHandler({
    getAdminSessionFromRequest: async () => null,
    adminLogin: async () => {
      throw new Error("INVALID_CREDENTIALS")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/auth/login",
      JSON.stringify({ email: "admin@example.com", password: "wrong-password" }),
    ),
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "ADMIN_INVALID_CREDENTIALS",
    message: "邮箱或密码错误",
    data: null,
  })
})

test("admin session route returns 403 when session is missing", async () => {
  const handler = createAdminSessionGetHandler({
    getAdminSessionFromRequest: async () => null,
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/auth/session", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    code: "ADMIN_FORBIDDEN",
    message: "未登录或会话已过期",
    data: null,
  })
})

test("admin login route writes admin session cookies after successful authentication", async () => {
  const handler = createAdminLoginPostHandler({
    getAdminSessionFromRequest: async () => null,
    adminLogin: async () => ({
      sessionData: {
        adminAccountId: "admin-1",
        userId: "user-1",
        displayName: "Admin",
        avatarUrl: null,
        roles: ["super_admin"],
        status: "active",
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }),
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/auth/login",
      JSON.stringify({ email: "admin@example.com", password: "correct-password" }),
    ),
  )

  assert.equal(response.status, 200)
  assert.match(response.headers.get("set-cookie") ?? "", /admin-access-token=access-token/)
})

test("admin logout route clears cookies even when the admin session is already missing", async () => {
  const handler = createAdminLogoutPostHandler({
    getAdminSessionFromRequest: async () => null,
    adminLogout: async () => {
      throw new Error("should not logout without session")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/auth/logout", {
      method: "POST",
    }) as never,
  )

  assert.equal(response.status, 200)
  assert.match(response.headers.get("set-cookie") ?? "", /admin-access-token=;/)
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/)
})

test("admin dashboard route rejects unauthorized requests", async () => {
  const handler = createAdminDashboardOverviewGetHandler({
    getRequestAdmin: async () => ({
      ok: false,
      reason: "forbidden",
      message: "管理员登录态无效或已过期。",
    }),
    getDashboardOverview: async (adminAccountId: string) => {
      void adminAccountId
      throw new Error("should not load dashboard without admin session")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/dashboard/overview", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    code: "ADMIN_FORBIDDEN",
    message: "管理员登录态无效或已过期。",
    data: null,
  })
})
