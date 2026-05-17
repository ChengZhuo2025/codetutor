import { ROUTES } from "@/constants/routes"
import type {
  NotificationInAppItem,
  NotificationInAppListResponseData,
  NotificationMutationResponseData,
  NotificationSettingsData,
  UpdateNotificationSettingsRequest,
} from "@/lib/api/contracts/notifications"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { getCheckinDateKey } from "@/server/modules/checkins/logic"
import {
  buildShanghaiDateTimeIso,
  getShanghaiDateKey,
  getShanghaiTimeValue,
  hasReachedReminderTime,
  isWithinDoNotDisturbWindow,
  normalizeTimeValue,
} from "./logic"

type NotificationSettingsRow = {
  user_id: string
  checkin_reminder_enabled: boolean
  checkin_reminder_time: string
  progress_push_enabled: boolean
  channel_in_app_enabled: boolean
  channel_email_enabled: boolean
  channel_wechat_enabled: boolean
  do_not_disturb_enabled: boolean
  do_not_disturb_start: string
  do_not_disturb_end: string
}

type NotificationRow = {
  id: string
  type: "daily_checkin_reminder" | "progress_milestone"
  title: string
  content: string
  payload: Record<string, unknown> | null
  status: "unread" | "read" | "dismissed"
  scheduled_for: string | null
  read_at: string | null
  dismissed_at: string | null
  created_at: string
  updated_at: string
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsData = {
  checkinReminder: true,
  checkinTime: "09:00",
  progressPush: true,
  remindMethods: {
    app: true,
    email: false,
    wechat: false,
  },
  doNotDisturb: false,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
}

function mapSettingsRow(row: NotificationSettingsRow | null): NotificationSettingsData {
  if (!row) {
    return DEFAULT_NOTIFICATION_SETTINGS
  }

  return {
    checkinReminder: row.checkin_reminder_enabled,
    checkinTime: normalizeTimeValue(row.checkin_reminder_time, DEFAULT_NOTIFICATION_SETTINGS.checkinTime),
    progressPush: row.progress_push_enabled,
    remindMethods: {
      app: row.channel_in_app_enabled,
      email: row.channel_email_enabled,
      wechat: row.channel_wechat_enabled,
    },
    doNotDisturb: row.do_not_disturb_enabled,
    doNotDisturbStart: normalizeTimeValue(
      row.do_not_disturb_start,
      DEFAULT_NOTIFICATION_SETTINGS.doNotDisturbStart,
    ),
    doNotDisturbEnd: normalizeTimeValue(
      row.do_not_disturb_end,
      DEFAULT_NOTIFICATION_SETTINGS.doNotDisturbEnd,
    ),
  }
}

function buildSettingsUpsert(userId: string, input: UpdateNotificationSettingsRequest) {
  const now = new Date().toISOString()

  return {
    user_id: userId,
    checkin_reminder_enabled: input.checkinReminder,
    checkin_reminder_time: input.checkinTime,
    progress_push_enabled: input.progressPush,
    channel_in_app_enabled: input.remindMethods.app,
    channel_email_enabled: input.remindMethods.email,
    channel_wechat_enabled: input.remindMethods.wechat,
    do_not_disturb_enabled: input.doNotDisturb,
    do_not_disturb_start: input.doNotDisturbStart,
    do_not_disturb_end: input.doNotDisturbEnd,
    updated_at: now,
  }
}

function normalizePayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {}
  }

  return payload
}

function mapNotificationRow(row: NotificationRow): NotificationInAppItem {
  const payload = normalizePayload(row.payload)
  const actionHref = typeof payload.actionHref === "string" ? payload.actionHref : null
  const actionLabel = typeof payload.actionLabel === "string" ? payload.actionLabel : null

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    status: row.status,
    payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduledFor: row.scheduled_for,
    readAt: row.read_at,
    dismissedAt: row.dismissed_at,
    actionHref,
    actionLabel,
  }
}

async function loadSettingsRow(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notification_settings")
    .select(
      "user_id, checkin_reminder_enabled, checkin_reminder_time, progress_push_enabled, channel_in_app_enabled, channel_email_enabled, channel_wechat_enabled, do_not_disturb_enabled, do_not_disturb_start, do_not_disturb_end",
    )
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load notification settings")

  return (data as NotificationSettingsRow | null) ?? null
}

async function loadNotificationRow(userId: string, notificationId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      "id, type, title, content, payload, status, scheduled_for, read_at, dismissed_at, created_at, updated_at",
    )
    .eq("id", notificationId)
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load notification")

  return (data as NotificationRow | null) ?? null
}

async function hasCheckedInToday(userId: string, todayDate: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("id")
    .eq("user_id", userId)
    .eq("checkin_date", todayDate)
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query checkin status for notifications")
  return Boolean(data)
}

async function hasDailyReminderForDate(userId: string, dateKey: string) {
  const startAt = `${dateKey}T00:00:00+08:00`
  const endAt = `${dateKey}T23:59:59.999+08:00`
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "daily_checkin_reminder")
    .gte("created_at", startAt)
    .lte("created_at", endAt)
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query existing daily reminder")
  return Boolean(data)
}

async function insertNotification(input: {
  userId: string
  type: "daily_checkin_reminder" | "progress_milestone"
  title: string
  content: string
  payload?: Record<string, unknown>
  scheduledFor?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("user_notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
      payload: input.payload ?? {},
      status: "unread",
      scheduled_for: input.scheduledFor ?? null,
      created_at: now,
      updated_at: now,
    })
    .select(
      "id, type, title, content, payload, status, scheduled_for, read_at, dismissed_at, created_at, updated_at",
    )
    .single()

  assertSupabaseSuccess(error, "failed to insert user notification")

  return mapNotificationRow(data as NotificationRow)
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettingsData> {
  const row = await loadSettingsRow(userId)
  return mapSettingsRow(row)
}

export async function updateNotificationSettings(
  userId: string,
  input: UpdateNotificationSettingsRequest,
): Promise<NotificationSettingsData> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("user_notification_settings")
    .upsert(buildSettingsUpsert(userId, input), {
      onConflict: "user_id",
    })

  assertSupabaseSuccess(error, "failed to update notification settings")

  return getNotificationSettings(userId)
}

export async function ensureDueInAppNotifications(userId: string): Promise<void> {
  const settings = await getNotificationSettings(userId)

  if (!settings.remindMethods.app || !settings.checkinReminder) {
    return
  }

  const now = new Date()
  const currentTime = getShanghaiTimeValue(now)
  if (!hasReachedReminderTime(currentTime, settings.checkinTime)) {
    return
  }

  if (
    settings.doNotDisturb
    && isWithinDoNotDisturbWindow(
      currentTime,
      settings.doNotDisturbStart,
      settings.doNotDisturbEnd,
    )
  ) {
    return
  }

  const todayDate = getCheckinDateKey(now)
  if (await hasCheckedInToday(userId, todayDate)) {
    return
  }

  if (await hasDailyReminderForDate(userId, todayDate)) {
    return
  }

  await insertNotification({
    userId,
    type: "daily_checkin_reminder",
    title: "今天还没打卡",
    content: `现在已经到 ${settings.checkinTime} 了，去完成今天的学习打卡，保持连续进度。`,
    scheduledFor: buildShanghaiDateTimeIso(todayDate, settings.checkinTime),
    payload: {
      source: "daily_checkin",
      dedupeByDay: true,
      dayKey: getShanghaiDateKey(now),
      actionHref: `${ROUTES.achievements}#checkin-records`,
      actionLabel: "立即打卡",
    },
  })
}

export async function listInAppNotifications(
  userId: string,
): Promise<NotificationInAppListResponseData> {
  await ensureDueInAppNotifications(userId)

  const supabase = createSupabaseAdminClient()
  const [{ data: itemsData, error: itemsError }, unreadResult] = await Promise.all([
    supabase
      .from("user_notifications")
      .select(
        "id, type, title, content, payload, status, scheduled_for, read_at, dismissed_at, created_at, updated_at",
      )
      .eq("user_id", userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "unread"),
  ])

  assertSupabaseSuccess(itemsError, "failed to list in-app notifications")
  assertSupabaseSuccess(unreadResult.error, "failed to count unread notifications")

  const items = ((itemsData ?? []) as NotificationRow[])
    .map(mapNotificationRow)
    .sort((left, right) => {
      if (left.status === right.status) {
        return right.createdAt.localeCompare(left.createdAt)
      }
      return left.status === "unread" ? -1 : 1
    })

  return {
    items,
    unreadCount: unreadResult.count ?? 0,
  }
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<NotificationMutationResponseData | null> {
  const current = await loadNotificationRow(userId, notificationId)
  if (!current) {
    return null
  }

  if (current.status === "dismissed" || current.status === "read") {
    return {
      id: current.id,
      status: current.status,
      readAt: current.read_at,
      dismissedAt: current.dismissed_at,
    }
  }

  const now = new Date().toISOString()
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notifications")
    .update({
      status: "read",
      read_at: current.read_at ?? now,
      updated_at: now,
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id, status, read_at, dismissed_at")
    .single()

  assertSupabaseSuccess(error, "failed to mark notification as read")

  const updated = data as {
    id: string
    status: "read" | "dismissed"
    read_at: string | null
    dismissed_at: string | null
  }

  return {
    id: updated.id,
    status: updated.status,
    readAt: updated.read_at,
    dismissedAt: updated.dismissed_at,
  }
}

export async function dismissNotification(
  userId: string,
  notificationId: string,
): Promise<NotificationMutationResponseData | null> {
  const current = await loadNotificationRow(userId, notificationId)
  if (!current) {
    return null
  }

  if (current.status === "dismissed") {
    return {
      id: current.id,
      status: current.status,
      readAt: current.read_at,
      dismissedAt: current.dismissed_at,
    }
  }

  const now = new Date().toISOString()
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notifications")
    .update({
      status: "dismissed",
      read_at: current.read_at ?? now,
      dismissed_at: current.dismissed_at ?? now,
      updated_at: now,
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id, status, read_at, dismissed_at")
    .single()

  assertSupabaseSuccess(error, "failed to dismiss notification")

  const updated = data as {
    id: string
    status: "dismissed"
    read_at: string | null
    dismissed_at: string | null
  }

  return {
    id: updated.id,
    status: updated.status,
    readAt: updated.read_at,
    dismissedAt: updated.dismissed_at,
  }
}

export async function createProgressMilestoneNotification(
  userId: string,
  input: {
    title: string
    content: string
    payload?: Record<string, unknown>
    actionHref?: string | null
    actionLabel?: string | null
  },
) {
  const settings = await getNotificationSettings(userId)

  if (!settings.remindMethods.app || !settings.progressPush) {
    return null
  }

  const payload: Record<string, unknown> = {
    ...(input.payload ?? {}),
  }

  if (input.actionHref) {
    payload.actionHref = input.actionHref
  }

  if (input.actionLabel) {
    payload.actionLabel = input.actionLabel
  }

  return insertNotification({
    userId,
    type: "progress_milestone",
    title: input.title,
    content: input.content,
    payload,
  })
}
