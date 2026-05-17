"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DIALOG_PANEL_CLASS,
  USER_PANEL_DIVIDER_CLASS,
} from "@/components/ui/surface-styles"
import type { NotificationInAppItem } from "@/lib/api/contracts/notifications"
import { getInAppNotificationListTitle } from "@/lib/notifications/in-app-display"
import { cn } from "@/lib/utils"

type NotificationDetailDialogProps = {
  notification: NotificationInAppItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarkRead: (id: string) => Promise<unknown>
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - dateDay.getTime()) / 86400000)

  if (diffDays === 0) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
  }
  if (diffDays === 1) return "昨天"
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onMarkRead,
}: NotificationDetailDialogProps) {
  const router = useRouter()

  // 打开时：如果是未读状态，静默标记已读
  useEffect(() => {
    if (!open || !notification || notification.status !== "unread") return
    void onMarkRead(notification.id)
  }, [open, notification, onMarkRead])

  const handlePrimaryAction = useCallback(() => {
    if (!notification?.actionHref) return
    onOpenChange(false)
    router.push(notification.actionHref)
    const hashIndex = notification.actionHref.indexOf("#")
    if (hashIndex >= 0) {
      const targetId = notification.actionHref.slice(hashIndex + 1)
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 120)
    }
  }, [notification, router, onOpenChange])

  if (!notification) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          DIALOG_PANEL_CLASS,
          "max-h-[90vh] overflow-y-auto rounded-2xl p-0 sm:max-w-md",
        )}
      >
        <div className={cn("border-b px-5 pt-5 pb-4", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">
              {getInAppNotificationListTitle(notification)}
            </DialogTitle>
            <DialogDescription className="sr-only">通知详情</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {notification.content}
          </p>
          <div className="text-xs text-muted-foreground/60">
            时间：{formatRelativeTime(notification.createdAt)}
          </div>
        </div>

        {notification.actionHref && notification.actionLabel ? (
          <div className={cn("flex w-full flex-row flex-nowrap items-stretch gap-2 border-t px-5 py-4 sm:gap-3", USER_PANEL_DIVIDER_CLASS)}>
            <Button
              variant="default"
              onClick={handlePrimaryAction}
              className="min-w-0 flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {notification.actionLabel}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
