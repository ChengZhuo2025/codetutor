import test from "node:test"
import assert from "node:assert/strict"

import { buildAnalyticsAggregateSummary } from "../server/modules/analytics/service.ts"
import {
  hasReachedReminderTime,
  isWithinDoNotDisturbWindow,
  normalizeTimeValue,
} from "../server/modules/notifications/logic.ts"

test("buildAnalyticsAggregateSummary groups events by name, page, date, and unique users", () => {
  const summary = buildAnalyticsAggregateSummary([
    {
      id: "event-1",
      user_id: "user-1",
      event_name: "task_completed",
      page_path: "/learn",
      occurred_at: "2026-04-05T01:00:00.000Z",
    },
    {
      id: "event-2",
      user_id: "user-1",
      event_name: "task_completed",
      page_path: "/learn",
      occurred_at: "2026-04-05T02:00:00.000Z",
    },
    {
      id: "event-3",
      user_id: "user-2",
      event_name: "daily_checkin",
      page_path: "/achievements",
      occurred_at: "2026-04-06T02:00:00.000Z",
    },
  ])

  assert.deepEqual(summary, {
    totalEvents: 3,
    uniqueUsers: 2,
    byEventName: [
      { key: "task_completed", count: 2 },
      { key: "daily_checkin", count: 1 },
    ],
    byPagePath: [
      { key: "/learn", count: 2 },
      { key: "/achievements", count: 1 },
    ],
    dailyTrend: [
      { date: "2026-04-05", count: 2, uniqueUsers: 1 },
      { date: "2026-04-06", count: 1, uniqueUsers: 1 },
    ],
  })
})

test("notification time helpers handle reminder threshold and cross-day quiet hours", () => {
  assert.equal(hasReachedReminderTime("09:00", "09:00"), true)
  assert.equal(hasReachedReminderTime("08:59", "09:00"), false)

  assert.equal(isWithinDoNotDisturbWindow("23:30", "22:00", "08:00"), true)
  assert.equal(isWithinDoNotDisturbWindow("07:30", "22:00", "08:00"), true)
  assert.equal(isWithinDoNotDisturbWindow("12:00", "22:00", "08:00"), false)
})

test("normalizeTimeValue falls back when database time strings are missing or malformed", () => {
  assert.equal(normalizeTimeValue("09:30:00", "09:00"), "09:30")
  assert.equal(normalizeTimeValue("bad", "09:00"), "09:00")
  assert.equal(normalizeTimeValue(null, "09:00"), "09:00")
})
