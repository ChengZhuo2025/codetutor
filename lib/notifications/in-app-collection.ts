import type { NotificationInAppItem } from "@/lib/api/contracts/notifications"
import { getShanghaiDateKeyFromIso } from "@/lib/datetime/shanghai-date-key"

function normalizePayload(payload: Record<string, unknown> | undefined) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {}
  }

  return payload as Record<string, unknown>
}

function resolveNotificationSource(item: NotificationInAppItem) {
  const payload = normalizePayload(item.payload)
  return typeof payload.source === "string" ? payload.source : `${item.type}:${item.id}`
}

function shouldDedupeNotificationByDay(item: NotificationInAppItem) {
  const payload = normalizePayload(item.payload)
  return payload.dedupeByDay === true
}

function resolveNotificationDateKey(item: NotificationInAppItem) {
  const payload = normalizePayload(item.payload)
  const payloadDayKey =
    typeof payload.checkinDate === "string"
      ? payload.checkinDate
      : typeof payload.dayKey === "string"
        ? payload.dayKey
        : null

  return payloadDayKey
    ?? getShanghaiDateKeyFromIso(item.createdAt)
    ?? item.createdAt.slice(0, 10)
}

export function dedupeSidebarNotifications(items: NotificationInAppItem[]) {
  const groups = new Map<string, NotificationInAppItem>()

  for (const item of items) {
    if (item.status === "dismissed") {
      continue
    }

    const key = shouldDedupeNotificationByDay(item)
      ? `${resolveNotificationSource(item)}:${resolveNotificationDateKey(item)}`
      : item.id

    const existing = groups.get(key)
    if (!existing || item.createdAt > existing.createdAt) {
      groups.set(key, item)
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
