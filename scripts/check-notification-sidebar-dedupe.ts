import test from "node:test"
import assert from "node:assert/strict"

import { dedupeSidebarNotifications } from "../lib/notifications/in-app-collection.ts"
import type { NotificationInAppItem } from "../lib/api/contracts/notifications.ts"

function buildNotification(
  overrides: Partial<NotificationInAppItem>,
): NotificationInAppItem {
  return {
    id: "notification-default",
    type: "progress_milestone",
    title: "默认标题",
    content: "默认内容",
    status: "unread",
    payload: {},
    createdAt: "2026-04-12T01:00:00.000Z",
    updatedAt: "2026-04-12T01:00:00.000Z",
    scheduledFor: null,
    readAt: null,
    dismissedAt: null,
    actionHref: null,
    actionLabel: null,
    ...overrides,
  }
}

test("sidebar keeps multiple task completion notifications from the same day", () => {
  const items = dedupeSidebarNotifications([
    buildNotification({
      id: "task-1",
      title: "第 1 关已完成",
      payload: {
        source: "task_complete:task-1",
      },
      createdAt: "2026-04-12T01:00:00.000Z",
      updatedAt: "2026-04-12T01:00:00.000Z",
    }),
    buildNotification({
      id: "task-2",
      title: "第 2 关已完成",
      payload: {
        source: "task_complete:task-2",
      },
      createdAt: "2026-04-12T03:00:00.000Z",
      updatedAt: "2026-04-12T03:00:00.000Z",
    }),
  ])

  assert.equal(items.length, 2)
  assert.deepEqual(
    items.map((item) => item.title),
    ["第 2 关已完成", "第 1 关已完成"],
  )
})

test("sidebar dedupes daily checkin notifications by business day and keeps the latest one", () => {
  const items = dedupeSidebarNotifications([
    buildNotification({
      id: "checkin-reminder-1",
      type: "daily_checkin_reminder",
      title: "今天还没打卡",
      payload: {
        source: "daily_checkin",
        dedupeByDay: true,
        dayKey: "2026-04-12",
      },
      createdAt: "2026-04-12T01:00:00.000Z",
      updatedAt: "2026-04-12T01:00:00.000Z",
    }),
    buildNotification({
      id: "checkin-success-1",
      type: "progress_milestone",
      title: "今日打卡成功",
      payload: {
        source: "daily_checkin",
        dedupeByDay: true,
        checkinDate: "2026-04-12",
      },
      createdAt: "2026-04-12T02:00:00.000Z",
      updatedAt: "2026-04-12T02:00:00.000Z",
    }),
  ])

  assert.equal(items.length, 1)
  assert.equal(items[0]?.id, "checkin-success-1")
})
