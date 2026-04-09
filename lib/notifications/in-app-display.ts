import type { NotificationInAppItem } from "@/lib/api/contracts/notifications"
import {
  diffCalendarDaysBetweenKeys,
  getShanghaiDateKeyFromIso,
} from "@/lib/datetime/shanghai-date-key"

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizePayload(payload: Record<string, unknown> | undefined) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {}
  }
  return payload as Record<string, unknown>
}

/**
 * Business calendar day for the notification (Shanghai), for check-in related types.
 */
export function resolveNotificationDayKey(item: NotificationInAppItem): string | null {
  const r = normalizePayload(item.payload)

  if (item.type === "daily_checkin_reminder") {
    if (typeof r.dayKey === "string" && DAY_KEY_RE.test(r.dayKey)) {
      return r.dayKey
    }
    if (typeof r.checkinDate === "string" && DAY_KEY_RE.test(r.checkinDate)) {
      return r.checkinDate
    }
    return getShanghaiDateKeyFromIso(item.createdAt)
  }

  if (
    item.type === "progress_milestone"
    && typeof r.checkinDate === "string"
    && DAY_KEY_RE.test(r.checkinDate)
  ) {
    return r.checkinDate
  }

  return null
}

/**
 * Relative label vs Shanghai "today": 今天 / 昨天 / M月D日 / YYYY年M月D日
 */
export function formatRelativeDayLabel(dayKey: string, now: Date = new Date()): string {
  const todayKey = getShanghaiDateKeyFromIso(now.toISOString())
  if (!todayKey) {
    return dayKey
  }

  const diff = diffCalendarDaysBetweenKeys(dayKey, todayKey)
  if (diff === null) {
    return dayKey
  }
  if (diff === 0) return "今天"
  if (diff === 1) return "昨天"

  const [y, m, d] = dayKey.split("-").map(Number)
  if (!y || !m || !d) return dayKey

  const todayYear = Number(todayKey.slice(0, 4))
  if (y === todayYear) {
    return `${m}月${d}日`
  }
  return `${y}年${m}月${d}日`
}

export function getInAppNotificationListTitle(
  item: NotificationInAppItem,
  now: Date = new Date(),
): string {
  const dayKey = resolveNotificationDayKey(item)
  if (item.type === "daily_checkin_reminder" && dayKey) {
    return `${formatRelativeDayLabel(dayKey, now)}还未打卡`
  }
  if (item.type === "progress_milestone" && dayKey) {
    return `${formatRelativeDayLabel(dayKey, now)}打卡成功`
  }
  return item.title
}
