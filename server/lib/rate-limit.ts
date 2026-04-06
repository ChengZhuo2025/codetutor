type WindowCheckInput = {
  bucket: string
  key: string
  max: number
  windowMs: number
  nowMs?: number
}

type ConcurrencyInput = {
  bucket: string
  key: string
  maxConcurrent: number
}

export type WindowCheckResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export type ConcurrencyAcquireResult = {
  allowed: boolean
  current: number
  release: () => void
}

type WindowState = {
  count: number
  resetAt: number
}

function buildCompositeKey(bucket: string, key: string) {
  return `${bucket}::${key}`
}

export function createInMemoryRateLimiter() {
  const windows = new Map<string, WindowState>()
  const concurrency = new Map<string, number>()

  return {
    checkWindow(input: WindowCheckInput): WindowCheckResult {
      const nowMs = input.nowMs ?? Date.now()
      const compositeKey = buildCompositeKey(input.bucket, input.key)
      const current = windows.get(compositeKey)

      if (!current || current.resetAt <= nowMs) {
        const resetAt = nowMs + input.windowMs
        windows.set(compositeKey, {
          count: 1,
          resetAt,
        })

        return {
          allowed: true,
          remaining: Math.max(0, input.max - 1),
          resetAt,
          retryAfterSeconds: 0,
        }
      }

      if (current.count >= input.max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: current.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
        }
      }

      current.count += 1
      windows.set(compositeKey, current)

      return {
        allowed: true,
        remaining: Math.max(0, input.max - current.count),
        resetAt: current.resetAt,
        retryAfterSeconds: 0,
      }
    },
    acquireConcurrency(input: ConcurrencyInput): ConcurrencyAcquireResult {
      const compositeKey = buildCompositeKey(input.bucket, input.key)
      const current = concurrency.get(compositeKey) ?? 0

      if (current >= input.maxConcurrent) {
        return {
          allowed: false,
          current,
          release() {},
        }
      }

      const next = current + 1
      concurrency.set(compositeKey, next)

      let released = false

      return {
        allowed: true,
        current: next,
        release() {
          if (released) {
            return
          }
          released = true

          const active = concurrency.get(compositeKey) ?? 0
          if (active <= 1) {
            concurrency.delete(compositeKey)
            return
          }

          concurrency.set(compositeKey, active - 1)
        },
      }
    },
  }
}
