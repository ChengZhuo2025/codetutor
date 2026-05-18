"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCheck, RefreshCw, Trash2 } from "lucide-react"
import type {
  AdminNotificationListItem,
  AdminNotificationListResponseData,
  AdminNotificationMutationResponseData,
} from "@/lib/api/contracts/admin"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { adminRequestData, getAdminApiErrorMessage, isAdminSessionExpiredError } from "@/lib/api/admin-bff-client"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  formatAdminNotificationCategory,
  formatAdminNotificationDateTime,
  formatAdminNotificationSeverity,
  getAdminNotificationSeverityBadgeClass,
  getAdminNotificationStatusBadgeClass,
} from "../lib/view-model"

type FilterState = "all" | "unread" | "read" | "dismissed"

function NotificationCard({
  item,
  onRead,
  onDismiss,
}: {
  item: AdminNotificationListItem
  onRead: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}) {
  const statusClass = getAdminNotificationStatusBadgeClass(item.status)
  const severityClass = getAdminNotificationSeverityBadgeClass(item.severity)

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityClass}>{formatAdminNotificationSeverity(item.severity)}</Badge>
            <Badge className={statusClass}>{item.status === "unread" ? "未读" : item.status === "read" ? "已读" : "已忽略"}</Badge>
            <span className="text-xs text-muted-foreground">{formatAdminNotificationCategory(item.category)}</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{item.content}</p>
          <p className="text-xs text-muted-foreground">
            {item.sourceType}
            {item.sourceId ? ` · ${item.sourceId}` : ""}
            {" · "}
            {formatAdminNotificationDateTime(item.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {item.targetUrl ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={item.targetUrl}>查看</Link>
            </Button>
          ) : null}
          {item.status !== "read" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void onRead(item.id)}>
              <CheckCheck className="h-4 w-4" />
              已读
            </Button>
          ) : null}
          {item.status !== "dismissed" ? (
            <Button type="button" variant="destructiveSoft" size="sm" onClick={() => void onDismiss(item.id)}>
              <Trash2 className="h-4 w-4" />
              忽略
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function AdminNotificationList() {
  const toast = useAppToast()
  const [data, setData] = useState<AdminNotificationListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterState>("all")
  const [authExpired, setAuthExpired] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") {
        params.set("status", filter)
      }
      params.set("limit", "20")
      params.set("page", "1")
      const result = await adminRequestData<AdminNotificationListResponseData>(
        `/admin/notifications?${params.toString()}`,
        { method: "GET" },
        "获取消息失败",
      )
      setData(result)
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      toast.error(getAdminApiErrorMessage(error, "获取消息失败"))
    } finally {
      setIsLoading(false)
    }
  }, [filter, toast])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  const mutateNotification = async (
    id: string,
    action: "read" | "dismiss",
  ) => {
    try {
      const result = await adminRequestData<AdminNotificationMutationResponseData>(
        `/admin/notifications/${id}/${action}`,
        { method: "POST" },
        action === "read" ? "标记已读失败" : "忽略消息失败",
      )

      setData((current) => {
        if (!current) {
          return current
        }

        const nextItems = current.items
          .map((item) => (item.id === result.id ? { ...item, ...result } : item))
          .filter((item) => item.status !== "dismissed")

        return {
          ...current,
          items: nextItems,
          unreadCount: nextItems.filter((item) => item.status === "unread").length,
        }
      })
      toast.success(action === "read" ? "已标记为已读" : "已忽略")
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      toast.error(getAdminApiErrorMessage(error, action === "read" ? "标记已读失败" : "忽略消息失败"))
    }
  }

  const unreadCount = data?.unreadCount ?? 0

  const filteredItems = useMemo(() => data?.items ?? [], [data?.items])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchNotifications()
      toast.success("消息已刷新")
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading && !data) {
    return <StatePanel status="loading" title="加载消息" description="正在拉取管理后台消息中心。" />
  }

  if (!data) {
    return <StatePanel status="empty" title="暂无消息" description="系统当前没有可显示的后台消息。" />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">消息中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">集中处理反馈、支付、AI 和系统消息。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-primary/20 bg-primary/10 text-primary">未读 {unreadCount}</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "unread", "read", "dismissed"] as FilterState[]).map((item) => (
          <Button
            key={item}
            type="button"
            variant={filter === item ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(item)}
          >
            {item === "all" ? "全部" : item === "unread" ? "未读" : item === "read" ? "已读" : "已忽略"}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onRead={async (id) => void mutateNotification(id, "read")}
            onDismiss={async (id) => void mutateNotification(id, "dismiss")}
          />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <StatePanel
          compact
          status="empty"
          title="当前筛选下没有消息"
          description="试试切换到全部或未读。"
        />
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>总数 {data.total}</span>
        <span>未读 {unreadCount}</span>
      </div>
    </div>
  )
}
