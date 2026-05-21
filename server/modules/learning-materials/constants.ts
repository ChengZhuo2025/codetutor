import "server-only"

/** Legacy Phase A HTML host list. Runtime source support is resolved by source-resolver.ts. */
export const MATERIAL_PLAN_ALLOWED_HOSTS = new Set([
  "developer.mozilla.org",
  "nextjs.org",
  "web.dev",
])

export const MATERIAL_PLAN_MAX_LINKS = 1
export const MATERIAL_PLAN_FETCH_TIMEOUT_MS = 10_000
export const MATERIAL_PLAN_MAX_TEXT_CHARS = 500_000
export const MATERIAL_PLAN_MIN_TOTAL_CHARS = 400
export const MATERIAL_PLAN_HIGH_CONFIDENCE_TARGET_CHARS = 1200
export const MATERIAL_PLAN_HIGH_CONFIDENCE_MIN_CHARS = 700
export const MATERIAL_PLAN_TOTAL_USEFUL_TARGET_CHARS = 1600
export const MATERIAL_PLAN_WEAK_EVIDENCE_HIGH_CONFIDENCE_CHARS = 400
export const MATERIAL_PLAN_WEAK_EVIDENCE_TOTAL_CHARS = 700

export const MATERIAL_PLAN_ACTIVE_STATUSES = [
  "queued",
  "extracting",
  "planning",
  "quality_checking",
] as const
