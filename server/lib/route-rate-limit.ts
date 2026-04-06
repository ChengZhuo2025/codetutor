import { markRateLimitStatus } from "@/server/lib/observability"
import { createInMemoryRateLimiter } from "@/server/lib/rate-limit"

const routeRateLimiter = createInMemoryRateLimiter()

type WindowLimitInput = {
  bucket: string
  key: string
  max: number
  windowMs: number
  message: string
}

type ConcurrencyLimitInput = {
  bucket: string
  key: string
  maxConcurrent: number
  message: string
}

function createRateLimitedResponse(input: {
  message: string
  retryAfterSeconds: number
  resetAt: number
}) {
  const response = Response.json(
    {
      code: "RATE_LIMITED",
      message: input.message,
      data: null,
    },
    {
      status: 429,
    },
  )

  response.headers.set("Retry-After", String(input.retryAfterSeconds))
  response.headers.set("X-RateLimit-Remaining", "0")
  response.headers.set("X-RateLimit-Reset", String(input.resetAt))
  return response
}

export function applyWindowRateLimit(input: WindowLimitInput) {
  const result = routeRateLimiter.checkWindow({
    bucket: input.bucket,
    key: input.key,
    max: input.max,
    windowMs: input.windowMs,
  })

  if (!result.allowed) {
    markRateLimitStatus("blocked")
    return {
      ok: false as const,
      response: createRateLimitedResponse({
        message: input.message,
        retryAfterSeconds: result.retryAfterSeconds,
        resetAt: result.resetAt,
      }),
    }
  }

  markRateLimitStatus("allow")
  return {
    ok: true as const,
    headers: {
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
  }
}

export function applyConcurrencyLimit(input: ConcurrencyLimitInput) {
  const lease = routeRateLimiter.acquireConcurrency({
    bucket: input.bucket,
    key: input.key,
    maxConcurrent: input.maxConcurrent,
  })

  if (!lease.allowed) {
    markRateLimitStatus("blocked")
    return {
      ok: false as const,
      response: createRateLimitedResponse({
        message: input.message,
        retryAfterSeconds: 1,
        resetAt: Date.now() + 1000,
      }),
    }
  }

  markRateLimitStatus("allow")
  return {
    ok: true as const,
    lease,
  }
}

export function attachRateLimitHeaders(
  response: Response,
  headers: {
    remaining: number
    resetAt: number
  },
) {
  response.headers.set("X-RateLimit-Remaining", String(headers.remaining))
  response.headers.set("X-RateLimit-Reset", String(headers.resetAt))
  return response
}

export function wrapResponseWithConcurrencyLease(
  response: Response,
  release: () => void,
) {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/event-stream") || !response.body) {
    release()
    return response
  }

  const reader = response.body.getReader()
  const headers = new Headers(response.headers)

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()

        if (done) {
          release()
          controller.close()
          return
        }

        if (value) {
          controller.enqueue(value)
        }
      } catch (error) {
        release()
        controller.error(error)
      }
    },
    async cancel(reason) {
      release()
      await reader.cancel(reason)
    },
  })

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
