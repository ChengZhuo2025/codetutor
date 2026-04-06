import { AsyncLocalStorage } from "node:async_hooks"
import { performance } from "node:perf_hooks"
import { randomUUID } from "node:crypto"

type CacheStatus = "skip" | "hit" | "miss"
type RateLimitStatus = "skip" | "allow" | "blocked"

type RequestObservabilityMeta = {
  route: string
  feature: string
  method: string
}

type ServerTimingEntry = {
  name: string
  durationMs: number
}

type RequestObservabilityState = RequestObservabilityMeta & {
  requestId: string
  startedAtMs: number
  authCacheStatuses: Set<CacheStatus>
  configCacheStatuses: Set<CacheStatus>
  rateLimitStatuses: Set<RateLimitStatus>
  timings: ServerTimingEntry[]
}

const observabilityStore = new AsyncLocalStorage<RequestObservabilityState>()

function getState() {
  return observabilityStore.getStore() ?? null
}

function summarizeCacheStatuses(statuses: Set<CacheStatus>) {
  const meaningful = [...statuses].filter((status) => status !== "skip")
  const unique = new Set(meaningful)

  if (unique.has("hit") && unique.has("miss")) {
    return "mixed"
  }
  if (unique.has("hit")) {
    return "hit"
  }
  if (unique.has("miss")) {
    return "miss"
  }
  return "skip"
}

function summarizeRateLimitStatuses(statuses: Set<RateLimitStatus>) {
  if (statuses.has("blocked")) {
    return "blocked"
  }
  if (statuses.has("allow")) {
    return "allow"
  }
  return "skip"
}

function buildServerTimingHeader(timings: ServerTimingEntry[]) {
  return timings
    .map((entry) => `${entry.name};dur=${Number(entry.durationMs.toFixed(1))}`)
    .join(", ")
}

function applyObservabilityHeaders(response: Response, state: RequestObservabilityState) {
  response.headers.set("X-Request-Id", state.requestId)
  response.headers.set("X-Auth-Cache", summarizeCacheStatuses(state.authCacheStatuses))
  response.headers.set("X-Config-Cache", summarizeCacheStatuses(state.configCacheStatuses))
  response.headers.set("X-Rate-Limit", summarizeRateLimitStatuses(state.rateLimitStatuses))

  const serverTiming = buildServerTimingHeader(state.timings)
  if (serverTiming) {
    response.headers.set("Server-Timing", serverTiming)
  }

  return response
}

function logRequestSummary(state: RequestObservabilityState, response: Response) {
  const durationMs = Number((performance.now() - state.startedAtMs).toFixed(1))

  console.info(
    JSON.stringify({
      type: "request_observability",
      route: state.route,
      feature: state.feature,
      method: state.method,
      requestId: state.requestId,
      status: response.status,
      durationMs,
      authCache: summarizeCacheStatuses(state.authCacheStatuses),
      configCache: summarizeCacheStatuses(state.configCacheStatuses),
      rateLimit: summarizeRateLimitStatuses(state.rateLimitStatuses),
      serverTimings: state.timings.map((item) => ({
        name: item.name,
        durationMs: Number(item.durationMs.toFixed(1)),
      })),
    }),
  )
}

export function getCurrentRequestId() {
  return getState()?.requestId ?? null
}

export function markAuthCacheStatus(status: CacheStatus) {
  getState()?.authCacheStatuses.add(status)
}

export function markConfigCacheStatus(status: CacheStatus) {
  getState()?.configCacheStatuses.add(status)
}

export function markRateLimitStatus(status: RateLimitStatus) {
  getState()?.rateLimitStatuses.add(status)
}

export function recordServerTiming(name: string, durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return
  }

  getState()?.timings.push({
    name,
    durationMs,
  })
}

export async function withRequestObservability(
  meta: RequestObservabilityMeta,
  run: () => Promise<Response>,
) {
  const state: RequestObservabilityState = {
    ...meta,
    requestId: randomUUID(),
    startedAtMs: performance.now(),
    authCacheStatuses: new Set<CacheStatus>(),
    configCacheStatuses: new Set<CacheStatus>(),
    rateLimitStatuses: new Set<RateLimitStatus>(),
    timings: [],
  }

  return observabilityStore.run(state, async () => {
    const response = await run()
    applyObservabilityHeaders(response, state)
    logRequestSummary(state, response)
    return response
  })
}
