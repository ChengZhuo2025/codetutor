export const DAILY_CHECKIN_SCORE = 5

const SHANGHAI_TIME_ZONE = "Asia/Shanghai"

export function getCheckinDateKey(date = new Date()) {
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

function getDayDiff(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00+08:00`).getTime()
  const to = new Date(`${toDate}T00:00:00+08:00`).getTime()

  return Math.round((to - from) / 86400000)
}

export function resolveNextStreakDays(input: {
  previousCheckinDate: string | null
  currentStreakDays: number
  todayDate: string
}) {
  if (input.previousCheckinDate === input.todayDate) {
    return {
      alreadyCheckedInToday: true,
      nextStreakDays: Math.max(0, input.currentStreakDays),
    }
  }

  if (!input.previousCheckinDate) {
    return {
      alreadyCheckedInToday: false,
      nextStreakDays: 1,
    }
  }

  const dayDiff = getDayDiff(input.previousCheckinDate, input.todayDate)

  return {
    alreadyCheckedInToday: false,
    nextStreakDays: dayDiff === 1 ? Math.max(1, input.currentStreakDays) + 1 : 1,
  }
}
