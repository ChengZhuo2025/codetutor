type RuntimeCacheOptions = {
  name: string
  ttlMs: number
  maxEntries: number
}

type CacheEntry<Value> = {
  value: Value
  expiresAt: number
  updatedAt: number
}

export type RuntimeCacheLoadStatus = "hit" | "miss"

export type RuntimeCacheLoadResult<Value> = {
  value: Value
  status: RuntimeCacheLoadStatus
}

export type RuntimeCache<Value> = {
  getOrLoad: (key: string, loader: () => Promise<Value>) => Promise<Value>
  getOrLoadDetailed: (
    key: string,
    loader: () => Promise<Value>,
  ) => Promise<RuntimeCacheLoadResult<Value>>
  set: (key: string, value: Value) => void
  delete: (key: string) => void
  clear: () => void
  size: () => number
}

function evictOverflow<Value>(
  store: Map<string, CacheEntry<Value>>,
  maxEntries: number,
) {
  if (store.size <= maxEntries) {
    return
  }

  const oldestKey = store.keys().next().value
  if (typeof oldestKey === "string") {
    store.delete(oldestKey)
  }
}

export function createRuntimeCache<Value>(
  options: RuntimeCacheOptions,
): RuntimeCache<Value> {
  const store = new Map<string, CacheEntry<Value>>()
  const inflight = new Map<string, Promise<Value>>()

  function read(key: string, now: number) {
    const current = store.get(key)
    if (!current) {
      return null
    }

    if (current.expiresAt <= now) {
      store.delete(key)
      return null
    }

    // Touch insertion order so frequently used keys survive overflow eviction longer.
    store.delete(key)
    store.set(key, current)
    return current
  }

  return {
    async getOrLoad(key, loader) {
      const result = await this.getOrLoadDetailed(key, loader)
      return result.value
    },
    async getOrLoadDetailed(key, loader) {
      const now = Date.now()
      const existing = read(key, now)
      if (existing) {
        return {
          value: existing.value,
          status: "hit",
        }
      }

      const pending = inflight.get(key)
      if (pending) {
        const value = await pending
        return {
          value,
          status: "miss",
        }
      }

      const pendingLoad = (async () => {
        const value = await loader()
        store.set(key, {
          value,
          expiresAt: Date.now() + options.ttlMs,
          updatedAt: Date.now(),
        })
        evictOverflow(store, options.maxEntries)
        return value
      })()

      inflight.set(key, pendingLoad)

      try {
        const value = await pendingLoad
        return {
          value,
          status: "miss",
        }
      } finally {
        inflight.delete(key)
      }
    },
    set(key, value) {
      store.set(key, {
        value,
        expiresAt: Date.now() + options.ttlMs,
        updatedAt: Date.now(),
      })
      inflight.delete(key)
      evictOverflow(store, options.maxEntries)
    },
    delete(key) {
      store.delete(key)
      inflight.delete(key)
    },
    clear() {
      store.clear()
      inflight.clear()
    },
    size() {
      return store.size
    },
  }
}
