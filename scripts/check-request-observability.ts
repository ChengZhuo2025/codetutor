import test from "node:test"
import assert from "node:assert/strict"

import {
  markAuthCacheStatus,
  markConfigCacheStatus,
  markRateLimitStatus,
  recordServerTiming,
  withRequestObservability,
} from "../server/lib/observability.ts"

test("request observability adds diagnostics headers to responses", async () => {
  const response = await withRequestObservability(
    {
      route: "/api/learning/message",
      feature: "learning",
      method: "POST",
    },
    async () => {
      markAuthCacheStatus("hit")
      markConfigCacheStatus("miss")
      markRateLimitStatus("allow")
      recordServerTiming("auth", 4.2)
      recordServerTiming("provider", 18.4)

      return Response.json({ ok: true })
    },
  )

  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/)
  assert.equal(response.headers.get("x-auth-cache"), "hit")
  assert.equal(response.headers.get("x-config-cache"), "miss")
  assert.equal(response.headers.get("x-rate-limit"), "allow")

  const serverTiming = response.headers.get("server-timing") ?? ""
  assert.match(serverTiming, /auth;dur=4.2/)
  assert.match(serverTiming, /provider;dur=18.4/)
})

test("request observability summarizes mixed cache states", async () => {
  const response = await withRequestObservability(
    {
      route: "/api/admin/auth/session",
      feature: "admin-auth",
      method: "GET",
    },
    async () => {
      markAuthCacheStatus("miss")
      markAuthCacheStatus("hit")
      markConfigCacheStatus("skip")
      markConfigCacheStatus("hit")
      markRateLimitStatus("blocked")

      return Response.json({ ok: false }, { status: 429 })
    },
  )

  assert.equal(response.headers.get("x-auth-cache"), "mixed")
  assert.equal(response.headers.get("x-config-cache"), "hit")
  assert.equal(response.headers.get("x-rate-limit"), "blocked")
})
