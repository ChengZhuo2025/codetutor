import test from "node:test"
import assert from "node:assert/strict"

import { createRuntimeCache } from "../server/lib/runtime-cache.ts"

test("runtime cache reuses loaded value before ttl expires", async () => {
  const cache = createRuntimeCache<string>({
    name: "test-cache",
    ttlMs: 50,
    maxEntries: 10,
  })

  let loadCount = 0
  const loader = async () => {
    loadCount += 1
    return `value-${loadCount}`
  }

  const first = await cache.getOrLoad("alpha", loader)
  const second = await cache.getOrLoad("alpha", loader)

  assert.equal(first, "value-1")
  assert.equal(second, "value-1")
  assert.equal(loadCount, 1)
})

test("runtime cache reloads after ttl expires", async () => {
  const cache = createRuntimeCache<string>({
    name: "expiring-cache",
    ttlMs: 5,
    maxEntries: 10,
  })

  let loadCount = 0
  const loader = async () => {
    loadCount += 1
    return `value-${loadCount}`
  }

  const first = await cache.getOrLoad("alpha", loader)
  await new Promise((resolve) => setTimeout(resolve, 15))
  const second = await cache.getOrLoad("alpha", loader)

  assert.equal(first, "value-1")
  assert.equal(second, "value-2")
  assert.equal(loadCount, 2)
})

test("runtime cache deduplicates concurrent loads for the same key", async () => {
  const cache = createRuntimeCache<string>({
    name: "dedupe-cache",
    ttlMs: 50,
    maxEntries: 10,
  })

  let loadCount = 0
  const loader = async () => {
    loadCount += 1
    await new Promise((resolve) => setTimeout(resolve, 10))
    return "shared"
  }

  const [first, second, third] = await Promise.all([
    cache.getOrLoad("alpha", loader),
    cache.getOrLoad("alpha", loader),
    cache.getOrLoad("alpha", loader),
  ])

  assert.equal(first, "shared")
  assert.equal(second, "shared")
  assert.equal(third, "shared")
  assert.equal(loadCount, 1)
})

test("runtime cache supports null values for short negative caching", async () => {
  const cache = createRuntimeCache<null>({
    name: "negative-cache",
    ttlMs: 50,
    maxEntries: 10,
  })

  let loadCount = 0
  const loader = async () => {
    loadCount += 1
    return null
  }

  const first = await cache.getOrLoad("missing", loader)
  const second = await cache.getOrLoad("missing", loader)

  assert.equal(first, null)
  assert.equal(second, null)
  assert.equal(loadCount, 1)
})

test("runtime cache can be prewarmed with an explicit value", async () => {
  const cache = createRuntimeCache<string>({
    name: "prewarm-cache",
    ttlMs: 50,
    maxEntries: 10,
  })

  cache.set("alpha", "prewarmed")

  const value = await cache.getOrLoad("alpha", async () => {
    throw new Error("should not call loader for a prewarmed key")
  })

  assert.equal(value, "prewarmed")
})
