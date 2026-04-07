"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import type {
  NotificationInAppItem,
  NotificationInAppListResponseData,
  NotificationMutationResponseData,
} from "@/lib/api/contracts/notifications"
import { requestData } from "@/lib/api/client"
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/events"
import type { RecentPracticeRound } from "@/features/learning/types"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

/**
 * 同源通知去重：按 source + 日期 分组，每组只保留最新一条（createdAt 最晚）
 * 解决"今天还没打卡"和"今日打卡成功"同时出现的矛盾
 */
function getShanghaiDateKeyFromIso(isoString: string): string | null {
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

function dedupeNotifications(items: NotificationInAppItem[]): NotificationInAppItem[] {
  const groups = new Map<string, NotificationInAppItem>()

  for (const item of items) {
    if (item.status === "dismissed") {
      continue
    }

    const payload = item.payload ?? {}
    const payloadRecord =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {}

    // Prefer semantic "day key" from payload (stable for business logic),
    // otherwise fall back to Shanghai calendar day derived from createdAt.
    const payloadDayKey =
      typeof payloadRecord.checkinDate === "string"
        ? payloadRecord.checkinDate
        : typeof payloadRecord.dayKey === "string"
          ? payloadRecord.dayKey
          : null
    const dateKey = payloadDayKey ?? getShanghaiDateKeyFromIso(item.createdAt) ?? item.createdAt.slice(0, 10)

    // Prefer explicit source from payload, otherwise fall back to a stable semantic key.
    // Using title avoids duplicates when backend emits the same reminder twice with different payload shapes.
    const rawSource = payloadRecord.source
    const source =
      typeof rawSource === "string" ? rawSource : `${item.type}:${item.title}`

    const key = `${source}:${dateKey}`

    const existing = groups.get(key)
    if (!existing || item.createdAt > existing.createdAt) {
      groups.set(key, item)
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

type WorkspaceSidebarDataState = {
  profile: ProfileMeResponseData | null
  recentPracticeRounds: RecentPracticeRound[]
  notifications: NotificationInAppItem[]
  unreadNotificationCount: number
  hasLoaded: boolean
}

type WorkspaceSidebarDataContextValue = WorkspaceSidebarDataState & {
  updateProfile: (profile: ProfileMeResponseData) => void
  refresh: () => Promise<void>
  markNotificationRead: (notificationId: string) => Promise<NotificationMutationResponseData | null>
  dismissNotification: (notificationId: string) => Promise<NotificationMutationResponseData | null>
}

function applyNotificationMutation(
  current: WorkspaceSidebarDataState,
  mutation: NotificationMutationResponseData,
): WorkspaceSidebarDataState {
  const nextNotifications = current.notifications
    .map((item) => {
      if (item.id !== mutation.id) {
        return item
      }

      return {
        ...item,
        status: mutation.status,
        readAt: mutation.readAt,
        dismissedAt: mutation.dismissedAt,
      }
    })
    .filter((item) => item.status !== "dismissed")

  return {
    ...current,
    notifications: nextNotifications,
    unreadNotificationCount: nextNotifications.filter((item) => item.status === "unread").length,
  }
}

async function fetchWorkspaceNotifications() {
  try {
    return await requestData<NotificationInAppListResponseData>("/notifications/in-app")
  } catch {
    return {
      items: [],
      unreadCount: 0,
    }
  }
}

const WorkspaceSidebarDataContext =
  createContext<WorkspaceSidebarDataContextValue | null>(null)

async function fetchWorkspaceSidebarData(): Promise<WorkspaceSidebarDataState> {
  try {
    const session = await requestData<LearningCurrentSessionResponseData>("/learning/current-session")
    const notifications = await fetchWorkspaceNotifications()
    const deduped = dedupeNotifications(notifications.items)

    return {
      profile: session.profile,
      recentPracticeRounds: session.recentPracticeRounds,
      notifications: deduped,
      unreadNotificationCount: deduped.filter((n) => n.status === "unread").length,
      hasLoaded: true,
    }
  } catch {
    // fall back to profile-only mode when there is no active learning session
  }

  try {
    const profile = await requestData<ProfileMeResponseData>("/profile/me")
    const notifications = await fetchWorkspaceNotifications()
    const deduped = dedupeNotifications(notifications.items)

    return {
      profile,
      recentPracticeRounds: [],
      notifications: deduped,
      unreadNotificationCount: deduped.filter((n) => n.status === "unread").length,
      hasLoaded: true,
    }
  } catch {
    return {
      profile: null,
      recentPracticeRounds: [],
      notifications: [],
      unreadNotificationCount: 0,
      hasLoaded: true,
    }
  }
}

export function WorkspaceSidebarDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceSidebarDataState>({
    profile: null,
    recentPracticeRounds: [],
    notifications: [],
    unreadNotificationCount: 0,
    hasLoaded: false,
  })

  async function refresh() {
    const nextState = await fetchWorkspaceSidebarData()
    setState(nextState)
  }

  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    async function load() {
      const nextState = await fetchWorkspaceSidebarData()

      if (!cancelled) {
        setState(nextState)
      }
    }

    function handleProfileUpdated(event: Event) {
      const nextProfile = (event as CustomEvent<ProfileMeResponseData>).detail

      setState((current) => ({
        ...current,
        profile: nextProfile,
        hasLoaded: true,
      }))
    }

    void load()
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        setState({
          profile: null,
          recentPracticeRounds: [],
          notifications: [],
          unreadNotificationCount: 0,
          hasLoaded: true,
        })
        return
      }

      void load()
    })

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<WorkspaceSidebarDataContextValue>(
    () => ({
      ...state,
      updateProfile: (profile) => {
        setState((current) => ({
          ...current,
          profile,
          hasLoaded: true,
        }))
      },
      refresh,
      markNotificationRead: async (notificationId) => {
        const mutation = await requestData<NotificationMutationResponseData>(
          `/notifications/${notificationId}/read`,
          {
            method: "POST",
          },
        )

        setState((current) => applyNotificationMutation(current, mutation))
        return mutation
      },
      dismissNotification: async (notificationId) => {
        const mutation = await requestData<NotificationMutationResponseData>(
          `/notifications/${notificationId}/dismiss`,
          {
            method: "POST",
          },
        )

        setState((current) => applyNotificationMutation(current, mutation))
        return mutation
      },
    }),
    [state],
  )

  return (
    <WorkspaceSidebarDataContext.Provider value={value}>
      {children}
    </WorkspaceSidebarDataContext.Provider>
  )
}

export function useWorkspaceSidebarData() {
  const context = useContext(WorkspaceSidebarDataContext)

  if (!context) {
    throw new Error("useWorkspaceSidebarData must be used within WorkspaceSidebarDataProvider")
  }

  return context
}
