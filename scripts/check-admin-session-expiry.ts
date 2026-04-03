import test from "node:test"
import assert from "node:assert/strict"

import {
  buildAdminLoginRedirectPath,
  resolveAdminApiFailure,
} from "../features/admin-shell/lib/admin-session-expiry.ts"
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  adminBffFetch,
  adminRequestData,
  isAdminSessionExpiredError,
} from "../lib/api/admin-bff-client.ts"

test("resolveAdminApiFailure marks admin session expiry from 403 ADMIN_FORBIDDEN", () => {
  const result = resolveAdminApiFailure(
    403,
    {
      code: "ADMIN_FORBIDDEN",
      message: "管理员登录态无效或已过期。",
    },
    "获取数据失败",
  )

  assert.deepEqual(result, {
    authExpired: true,
    message: "管理员登录态无效或已过期。",
  })
})

test("resolveAdminApiFailure falls back to business message for non-auth errors", () => {
  const result = resolveAdminApiFailure(
    400,
    {
      code: "VALIDATION_FAILED",
      message: "limit 必须在 1 到 100 之间。",
    },
    "获取数据失败",
  )

  assert.deepEqual(result, {
    authExpired: false,
    message: "limit 必须在 1 到 100 之间。",
  })
})

test("buildAdminLoginRedirectPath keeps current path in next query", () => {
  assert.equal(
    buildAdminLoginRedirectPath("/admin/feedback/ticket-1"),
    "/admin/login?next=%2Fadmin%2Ffeedback%2Fticket-1",
  )
})

test("adminRequestData throws a structured admin-session-expired error", async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(
    JSON.stringify({
      code: "ADMIN_FORBIDDEN",
      message: "管理员登录态无效或已过期。",
      data: null,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )

  try {
    await assert.rejects(
      () => adminRequestData("/admin/feedback", { method: "GET" }, "获取反馈列表失败"),
      (error: unknown) => {
        assert.equal(isAdminSessionExpiredError(error), true)
        assert.ok(error instanceof Error)
        assert.equal(error.message, ADMIN_SESSION_EXPIRED_MESSAGE)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("adminBffFetch throws the same structured error for non-envelope admin endpoints", async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(
    JSON.stringify({
      code: "ADMIN_FORBIDDEN",
      message: "管理员登录态无效或已过期。",
      data: null,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )

  try {
    await assert.rejects(
      () => adminBffFetch("/docs/openapi", { method: "GET" }, "加载接口文档失败。"),
      (error: unknown) => {
        assert.equal(isAdminSessionExpiredError(error), true)
        assert.ok(error instanceof Error)
        assert.equal(error.message, ADMIN_SESSION_EXPIRED_MESSAGE)
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
