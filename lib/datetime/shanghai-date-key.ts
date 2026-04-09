/**
 * Calendar date key YYYY-MM-DD in Asia/Shanghai for an instant (ISO string or Date).
 */
export function getShanghaiDateKeyFromIso(isoString: string): string | null {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}

function parseDayKeyToUtcMidnight(key: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

/** Whole calendar days from `fromKey` to `toKey` (both YYYY-MM-DD). */
export function diffCalendarDaysBetweenKeys(fromKey: string, toKey: string): number | null {
  const a = parseDayKeyToUtcMidnight(fromKey)
  const b = parseDayKeyToUtcMidnight(toKey)
  if (a === null || b === null) return null
  return Math.round((b - a) / 86_400_000)
}
