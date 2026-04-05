const SHANGHAI_TIME_ZONE = "Asia/Shanghai"

export function getShanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return `${year}-${month}-${day}`
}

export function getShanghaiTimeValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHANGHAI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00"
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"

  return `${hour}:${minute}`
}

export function normalizeTimeValue(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback
  }

  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)/)
  return match ? `${match[1]}:${match[2]}` : fallback
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map((item) => Number.parseInt(item, 10))
  return hour * 60 + minute
}

export function hasReachedReminderTime(currentTime: string, reminderTime: string) {
  return toMinutes(currentTime) >= toMinutes(reminderTime)
}

export function isWithinDoNotDisturbWindow(
  currentTime: string,
  startTime: string,
  endTime: string,
) {
  const current = toMinutes(currentTime)
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)

  if (start === end) {
    return false
  }

  if (start < end) {
    return current >= start && current < end
  }

  return current >= start || current < end
}

export function buildShanghaiDateTimeIso(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue}:00+08:00`).toISOString()
}
