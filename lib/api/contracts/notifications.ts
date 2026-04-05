export const USER_NOTIFICATION_TYPES = [
  "daily_checkin_reminder",
  "progress_milestone",
] as const

export const USER_NOTIFICATION_STATUSES = [
  "unread",
  "read",
  "dismissed",
] as const

export type UserNotificationType = (typeof USER_NOTIFICATION_TYPES)[number]
export type UserNotificationStatus = (typeof USER_NOTIFICATION_STATUSES)[number]

export type NotificationSettingsData = {
  checkinReminder: boolean
  checkinTime: string
  progressPush: boolean
  remindMethods: {
    app: boolean
    email: boolean
    wechat: boolean
  }
  doNotDisturb: boolean
  doNotDisturbStart: string
  doNotDisturbEnd: string
}

export type UpdateNotificationSettingsRequest = NotificationSettingsData

export type NotificationInAppItem = {
  id: string
  type: UserNotificationType
  title: string
  content: string
  status: UserNotificationStatus
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
  scheduledFor: string | null
  readAt: string | null
  dismissedAt: string | null
  actionHref: string | null
  actionLabel: string | null
}

export type NotificationInAppListResponseData = {
  items: NotificationInAppItem[]
  unreadCount: number
}

export type NotificationMutationResponseData = {
  id: string
  status: UserNotificationStatus
  readAt: string | null
  dismissedAt: string | null
}
