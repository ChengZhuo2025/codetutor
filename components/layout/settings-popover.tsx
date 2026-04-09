"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Settings, User, Bell, LogOut, ChevronRight, X, MessageSquareMore } from "lucide-react"
import { APP_NAME, APP_VERSION } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { FeedbackDialog } from "@/components/layout/feedback-dialog"
import { ProfileEditDialog } from "@/components/layout/profile-edit-dialog"
import { NotificationSettingsDialog } from "@/components/layout/notification-settings-dialog"
import {
  FLOATING_PANEL_CLASS,
  USER_ICON_BUTTON_CLASS,
  USER_PANEL_DIVIDER_CLASS,
} from "@/components/ui/surface-styles"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"

const settingsItems: Array<{
  group: string
  items: Array<{
    icon: typeof User
    label: string
    desc: string
    dialog?: string
    danger?: boolean
  }>
}> = [
  {
    group: "账户",
    items: [
      { icon: User, label: "个人资料", desc: "修改头像/昵称", dialog: "profile" },
      { icon: Bell, label: "通知设置", desc: "打卡提醒/进度推送", dialog: "notification" },
    ],
  },
  {
    group: "建议反馈",
    items: [
      {
        icon: MessageSquareMore,
        label: "建议反馈",
        desc: "欢迎提供建议/反馈",
        dialog: "feedback",
      },
    ],
  },
  {
    group: "账号",
    items: [{ icon: LogOut, label: "退出登录", desc: "注销当前账号", danger: true }],
  },
]

type DialogType = "profile" | "notification" | "feedback" | null

type SettingsPopoverProps = {
  onProfileSaved?: (profile: ProfileMeResponseData) => void
  className?: string
  iconOnly?: boolean
}

export function SettingsPopover({
  onProfileSaved,
  className,
  iconOnly = false,
}: SettingsPopoverProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleItemClick = async (item: { dialog?: string; danger?: boolean }) => {
    if (item.danger) {
      setOpen(false)
      setActiveDialog(null)

      try {
        const supabase = createSupabaseBrowserClient()
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
        await supabase.auth.signOut().catch(() => undefined)
      } finally {
        router.replace(ROUTES.home)
      }

      return
    }
    if (item.dialog) {
      setOpen(false)
      setActiveDialog(item.dialog as DialogType)
    }
  }

  return (
    <>
      <div ref={ref} className={cn("relative z-[80]", className)}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2.5 rounded-full text-sm transition-colors",
            iconOnly ? "h-11 w-11 justify-center px-0 py-0" : "w-full px-3 py-2",
            open
              ? "bg-surface-3 text-foreground"
              : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
          )}
          aria-label="打开设置"
          title="设置"
        >
          <Settings className="h-4 w-4" />
          {iconOnly ? null : "设置"}
        </button>

        {open && (
          <div
            className={cn(
              FLOATING_PANEL_CLASS,
              "min-w-64 absolute bottom-full z-[80] mb-2 overflow-hidden rounded-[20px]",
              iconOnly ? "left-0" : "left-0 right-0",
            )}
          >
            <div className={cn("flex items-center justify-between border-b px-4 py-3", USER_PANEL_DIVIDER_CLASS)}>
              <span className="text-sm font-semibold">设置</span>
              <button
                onClick={() => setOpen(false)}
                className={cn("rounded-lg p-1", USER_ICON_BUTTON_CLASS)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="py-2">
              {settingsItems.map((group) => (
                <div key={group.group}>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 dark:text-foreground/35">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isDanger = Boolean(item.danger)

                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          void handleItemClick(item)
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/90 dark:hover:bg-foreground/6",
                          isDanger
                            ? "text-rose-600 hover:bg-rose-300/15 dark:text-rose-300 dark:hover:bg-rose-400/8"
                            : "text-foreground/88",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            isDanger
                              ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:border-rose-300/15 dark:bg-rose-300/10 dark:text-rose-400"
                              : "border-border bg-muted/60 text-muted-foreground dark:border-border/70 dark:bg-foreground/6 dark:text-foreground/78",
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isDanger
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-foreground/88",
                            )}
                          >
                            {item.label}
                          </p>
                          <p
                            className={cn(
                              "text-[12px] line-clamp-1",
                              isDanger
                                ? "text-rose-600/80 dark:text-rose-300/60"
                                : "text-foreground/48",
                            )}
                          >
                            {item.desc}
                          </p>
                        </div>
                        {!isDanger && <ChevronRight className="h-4 w-4 text-foreground/40" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className={cn("border-t px-4 py-2.5", USER_PANEL_DIVIDER_CLASS)}>
              <p className="text-[11px] text-muted-foreground/85 dark:text-foreground/38">
                {APP_NAME} v{APP_VERSION}
              </p>
            </div>
          </div>
        )}
      </div>

      <ProfileEditDialog
        open={activeDialog === "profile"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
        onSaved={onProfileSaved}
      />
      <NotificationSettingsDialog
        open={activeDialog === "notification"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
      />
      <FeedbackDialog
        open={activeDialog === "feedback"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
        source="settings_popover"
      />
    </>
  )
}
