"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react"
import type {
  AdminNotificationListItem,
  AdminNotificationListResponseData,
  AdminNotificationMutationResponseData,
} from "@/lib/api/contracts/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ADMIN_ROUTES } from "@/constants/routes"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  formatAdminNotificationCategory,
  formatAdminNotificationDateTime,
  formatAdminNotificationSeverity,
  getAdminNotificationSeverityBadgeClass,
  getAdminNotificationStatusBadgeClass,
} from "../lib/view-model"

function NotificationRow({
  item,
  onRead,
  onDismiss,
}: {
  item: AdminNotificationListItem
  onRead: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}) {
  const severityClass = getAdminNotificationSeverityBadgeClass(item.severity)
  const statusClass = getAdminNotificationStatusBadgeClass(item.status)

  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityClass}>{formatAdminNotificationSeverity(item.severity)}</Badge>
            <Badge className={statusClass}>
              {item.status === "unread" ? "未读" : item.status === "read" ? "已读" : "已忽略"}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatAdminNotificationCategory(item.category)}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="text-sm leading-6 text-muted-foreground">{item.content}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.sourceType}
            {item.sourceId ? ` · ${item.sourceId}` : ""}
            {" · "}
            {formatAdminNotificationDateTime(item.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.targetUrl ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={item.targetUrl}>
              <ExternalLink className="size-4" />
              查看
            </Link>
          </Button>
        ) : null}
        {item.status !== "read" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onRead(item.id)}>
            <CheckCheck className="size-4" />
            已读
          </Button>
        ) : null}
        {item.status !== "dismissed" ? (
          <Button type="button" variant="destructiveSoft" size="sm" onClick={() => void onDismiss(item.id)}>
            <Trash2 className="size-4" />
            忽略
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function NotificationListEmpty() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 text-center">
      <Bell className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">暂无消息</p>
      <p className="text-xs leading-5 text-muted-foreground">新反馈、支付、AI 或系统消息会在这里汇总。</p>
    </div>
  )
}

export function AdminNotificationCenter() {
  const toast = useAppToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AdminNotificationListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const unreadCount = data?.unreadCount ?? 0
  const items = useMemo(() => data?.items ?? [], [data?.items])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "6",
        page: "1",
        status: "all",
      })
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
  }, [toast])

  const mutateNotification = useCallback(
    async (id: string, action: "read" | "dismiss") => {
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
      } catch (error) {
        setAuthExpired(isAdminSessionExpiredError(error))
        toast.error(getAdminApiErrorMessage(error, action === "read" ? "标记已读失败" : "忽略消息失败"))
      }
    },
    [toast],
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchNotifications()
      toast.success("消息已刷新")
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (open) {
      void fetchNotifications()
    }
  }, [open, fetchNotifications])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-foreground dark:hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-brand/10 dark:active:bg-primary/15"
          aria-label="消息中心"
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-[34rem]">
        <SheetHeader className="items-start px-5 py-4">
          <div className="flex w-full items-center gap-3 pr-10">
            <div className="min-w-0 flex items-center gap-2">
              <SheetTitle className="text-base">消息中心</SheetTitle>
              <Badge className="border-primary/20 bg-primary/10 text-primary">未读 {unreadCount}</Badge>
            </div>
          </div>
          <SheetDescription className="-mt-0.5">
            集中处理反馈、支付、AI 和系统消息。
          </SheetDescription>
          <div className="flex w-full flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
              刷新
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                queueMicrotask(() => {
                  router.push(ADMIN_ROUTES.notifications)
                })
              }}
            >
              查看全部
            </Button>
          </div>
        </SheetHeader>
        <Separator />
        <div className="max-h-[calc(100vh-10rem)] space-y-3 overflow-y-auto px-5 py-4">
          {isLoading && !data ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : items.length > 0 ? (
            items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onRead={async (id) => void mutateNotification(id, "read")}
                onDismiss={async (id) => void mutateNotification(id, "dismiss")}
              />
            ))
          ) : (
            <NotificationListEmpty />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
