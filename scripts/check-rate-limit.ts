import test from "node:test"
import assert from "node:assert/strict"

import { createInMemoryRateLimiter } from "../server/lib/rate-limit.ts"

test("rate limiter blocks after the window quota is exceeded", () => {
  const limiter = createInMemoryRateLimiter()

  const first = limiter.checkWindow({
    bucket: "learning-message",
    key: "user-1",
    max: 2,
    windowMs: 60_000,
    nowMs: 1_000,
  })
  const second = limiter.checkWindow({
    bucket: "learning-message",
    key: "user-1",
    max: 2,
    windowMs: 60_000,
    nowMs: 2_000,
  })
  const third = limiter.checkWindow({
    bucket: "learning-message",
    key: "user-1",
    max: 2,
    windowMs: 60_000,
    nowMs: 3_000,
  })

  assert.equal(first.allowed, true)
  assert.equal(second.allowed, true)
  assert.equal(third.allowed, false)
  assert.equal(third.retryAfterSeconds, 58)
})

test("rate limiter resets allowance after the window moves forward", () => {
  const limiter = createInMemoryRateLimiter()

  limiter.checkWindow({
    bucket: "auth-login",
    key: "ip:127.0.0.1",
    max: 1,
    windowMs: 10_000,
    nowMs: 1_000,
  })

  const nextWindow = limiter.checkWindow({
    bucket: "auth-login",
    key: "ip:127.0.0.1",
    max: 1,
    windowMs: 10_000,
    nowMs: 12_000,
  })

  assert.equal(nextWindow.allowed, true)
  assert.equal(nextWindow.remaining, 0)
})

test("rate limiter enforces concurrent request ceiling per key", () => {
  const limiter = createInMemoryRateLimiter()

  const first = limiter.acquireConcurrency({
    bucket: "learning-message-concurrency",
    key: "user-1",
    maxConcurrent: 2,
  })
  const second = limiter.acquireConcurrency({
    bucket: "learning-message-concurrency",
    key: "user-1",
    maxConcurrent: 2,
  })
  const third = limiter.acquireConcurrency({
    bucket: "learning-message-concurrency",
    key: "user-1",
    maxConcurrent: 2,
  })

  assert.equal(first.allowed, true)
  assert.equal(second.allowed, true)
  assert.equal(third.allowed, false)

  first.release()

  const fourth = limiter.acquireConcurrency({
    bucket: "learning-message-concurrency",
    key: "user-1",
    maxConcurrent: 2,
  })

  assert.equal(fourth.allowed, true)

  second.release()
  fourth.release()
})
