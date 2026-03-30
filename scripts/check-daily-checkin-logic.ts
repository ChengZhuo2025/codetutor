import test from "node:test"
import assert from "node:assert/strict"

import {
  DAILY_CHECKIN_SCORE,
  getCheckinDateKey,
  resolveNextStreakDays,
} from "../server/modules/checkins/logic.ts"

test("getCheckinDateKey resolves a stable Shanghai-local date key", () => {
  assert.equal(
    getCheckinDateKey(new Date("2026-03-31T00:30:00+08:00")),
    "2026-03-31",
  )
})

test("resolveNextStreakDays returns idempotent when already checked in today", () => {
  assert.deepEqual(
    resolveNextStreakDays({
      previousCheckinDate: "2026-03-31",
      currentStreakDays: 4,
      todayDate: "2026-03-31",
    }),
    {
      alreadyCheckedInToday: true,
      nextStreakDays: 4,
    },
  )
})

test("resolveNextStreakDays increments streak when yesterday was checked in", () => {
  assert.deepEqual(
    resolveNextStreakDays({
      previousCheckinDate: "2026-03-30",
      currentStreakDays: 4,
      todayDate: "2026-03-31",
    }),
    {
      alreadyCheckedInToday: false,
      nextStreakDays: 5,
    },
  )
})

test("resolveNextStreakDays resets streak after a gap", () => {
  assert.deepEqual(
    resolveNextStreakDays({
      previousCheckinDate: "2026-03-28",
      currentStreakDays: 9,
      todayDate: "2026-03-31",
    }),
    {
      alreadyCheckedInToday: false,
      nextStreakDays: 1,
    },
  )
})

test("daily checkin score stays aligned with the achievement guide", () => {
  assert.equal(DAILY_CHECKIN_SCORE, 5)
})
