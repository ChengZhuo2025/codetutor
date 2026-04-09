import "server-only"

/** Phase A: frozen whitelist hostnames (lowercase, no port). */
export const MATERIAL_PLAN_ALLOWED_HOSTS = new Set([
  "developer.mozilla.org",
  "nextjs.org",
  "web.dev",
])

export const MATERIAL_PLAN_MAX_LINKS = 1
export const MATERIAL_PLAN_FETCH_TIMEOUT_MS = 10_000
export const MATERIAL_PLAN_MAX_TEXT_CHARS = 500_000
export const MATERIAL_PLAN_MIN_TOTAL_CHARS = 400

export const MATERIAL_PLAN_ACTIVE_STATUSES = [
  "queued",
  "extracting",
  "planning",
  "quality_checking",
] as const
