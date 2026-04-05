import { APP_EVENTS, type AppEventName } from "@/constants/events"
import type {
  AnalyticsAggregateSummary,
  AnalyticsTrackEventRequest,
  AnalyticsTrackEventResponseData,
} from "@/lib/api/contracts/analytics"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type AnalyticsRow = {
  id: string
  user_id: string | null
  event_name: string
  page_path: string | null
  occurred_at: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const EVENT_NAME_SET = new Set<AppEventName>(Object.values(APP_EVENTS))
const MAX_PROPERTY_DEPTH = 4
const MAX_PROPERTY_KEYS = 40
const MAX_ARRAY_LENGTH = 20
const MAX_STRING_LENGTH = 500

function sanitizeJsonValue(value: unknown, depth = 0): JsonValue | undefined {
  if (value == null) {
    return null
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value
  }

  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (depth >= MAX_PROPERTY_DEPTH) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined)
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_PROPERTY_KEYS)
    const next: Record<string, JsonValue> = {}

    for (const [rawKey, rawValue] of entries) {
      const key = rawKey.trim().slice(0, 64)

      if (!key) {
        continue
      }

      const sanitized = sanitizeJsonValue(rawValue, depth + 1)
      if (sanitized !== undefined) {
        next[key] = sanitized
      }
    }

    return next
  }

  return undefined
}

function sanitizeProperties(value: Record<string, unknown> | undefined) {
  if (!value) {
    return {}
  }

  const sanitized = sanitizeJsonValue(value, 0)
  if (!sanitized || Array.isArray(sanitized) || typeof sanitized !== "object") {
    return {}
  }

  return sanitized as Record<string, JsonValue>
}

export async function trackAnalyticsEvent(
  input: AnalyticsTrackEventRequest,
  options?: { userId?: string | null },
): Promise<AnalyticsTrackEventResponseData> {
  if (!EVENT_NAME_SET.has(input.eventName)) {
    throw new Error("eventName 不合法。")
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const occurredAt =
    typeof input.occurredAt === "string" && input.occurredAt.trim().length > 0
      ? input.occurredAt
      : now
  const pagePath =
    typeof input.pagePath === "string" && input.pagePath.trim().length > 0
      ? input.pagePath.trim().slice(0, 256)
      : null

  const { data, error } = await supabase
    .from("event_logs")
    .insert({
      user_id: options?.userId ?? null,
      event_name: input.eventName,
      event_source: "web",
      page_path: pagePath,
      properties: sanitizeProperties(input.properties),
      occurred_at: occurredAt,
      created_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(error, "failed to insert event log")

  return {
    eventId: (data as { id: string }).id,
    accepted: true,
  }
}

export function buildAnalyticsAggregateSummary(rows: AnalyticsRow[]): AnalyticsAggregateSummary {
  const eventCountMap = new Map<string, number>()
  const pageCountMap = new Map<string, number>()
  const dailyCountMap = new Map<string, number>()
  const dailyUserMap = new Map<string, Set<string>>()
  const uniqueUsers = new Set<string>()

  for (const row of rows) {
    eventCountMap.set(row.event_name, (eventCountMap.get(row.event_name) ?? 0) + 1)

    if (row.page_path) {
      pageCountMap.set(row.page_path, (pageCountMap.get(row.page_path) ?? 0) + 1)
    }

    const date = row.occurred_at.slice(0, 10)
    dailyCountMap.set(date, (dailyCountMap.get(date) ?? 0) + 1)

    if (row.user_id) {
      uniqueUsers.add(row.user_id)
      const dayUsers = dailyUserMap.get(date) ?? new Set<string>()
      dayUsers.add(row.user_id)
      dailyUserMap.set(date, dayUsers)
    }
  }

  const byEventName = Array.from(eventCountMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))

  const byPagePath = Array.from(pageCountMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))

  const dailyTrend = Array.from(dailyCountMap.entries())
    .map(([date, count]) => ({
      date,
      count,
      uniqueUsers: dailyUserMap.get(date)?.size ?? 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))

  return {
    totalEvents: rows.length,
    uniqueUsers: uniqueUsers.size,
    byEventName,
    byPagePath,
    dailyTrend,
  }
}

export async function getAnalyticsAggregateSummary(options?: {
  dateFrom?: string
  dateTo?: string
  eventNames?: AppEventName[]
}): Promise<AnalyticsAggregateSummary> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("event_logs")
    .select("id, user_id, event_name, page_path, occurred_at")
    .order("occurred_at", { ascending: true })

  if (options?.dateFrom) {
    query = query.gte("occurred_at", options.dateFrom)
  }

  if (options?.dateTo) {
    query = query.lte("occurred_at", options.dateTo)
  }

  if (options?.eventNames && options.eventNames.length > 0) {
    query = query.in("event_name", options.eventNames)
  }

  const { data, error } = await query
  assertSupabaseSuccess(error, "failed to aggregate event logs")

  return buildAnalyticsAggregateSummary((data ?? []) as AnalyticsRow[])
}
