"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Settings, User, Bell, LogOut, ChevronRight, X, MessageSquareMore } from "lucide-react"
import { APP_NAME, APP_VERSION } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { cn } from "@/lib/utils"
import { FeedbackDialog } from "@/components/layout/feedback-dialog"
import { ProfileEditDialog } from "@/components/layout/profile-edit-dialog"
import { NotificationSettingsDialog } from "@/components/layout/notification-settings-dialog"

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
      { icon: User, label: "个人资料", desc: "修改头像、用户名", dialog: "profile" },
      { icon: Bell, label: "通知设置", desc: "打卡提醒、进度推送", dialog: "notification" },
    ],
  },
  {
    group: "建议反馈",
    items: [
      {
        icon: MessageSquareMore,
        label: "建议反馈",
        desc: "前端设计、交互体验、功能与 Bug 反馈",
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

export function SettingsPopover() {
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

  const handleItemClick = (item: { dialog?: string; danger?: boolean }) => {
    if (item.danger) {
      setOpen(false)
      setActiveDialog(null)
      router.push(ROUTES.home)
      return
    }
    if (item.dialog) {
      setActiveDialog(item.dialog as DialogType)
    }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
            open
              ? "bg-surface-3 text-foreground"
              : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          设置
        </button>

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-[20px] border border-white/10 bg-[oklch(0.2_0.015_250/0.98)] shadow-[0_32px_80px_-36px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold">设置</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-foreground/55 transition-colors hover:bg-white/8 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="py-2">
              {settingsItems.map((group) => (
                <div key={group.group}>
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/35">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isDanger = Boolean(item.danger)

                    return (
                      <button
                        key={item.label}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/6",
                          isDanger ? "text-rose-300 hover:bg-rose-400/8" : "text-foreground/88",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                            isDanger
                              ? "border-rose-300/15 bg-rose-300/10 text-rose-400"
                              : "border-white/10 bg-white/6 text-foreground/78",
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isDanger ? "text-rose-400" : "text-foreground/88",
                            )}
                          >
                            {item.label}
                          </p>
                          <p
                            className={cn(
                              "text-[12px] mt-1",
                              isDanger ? "text-rose-300/60" : "text-foreground/48",
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

            <div className="border-t border-white/10 px-4 py-2.5">
              <p className="text-[11px] text-foreground/38">
                {APP_NAME} v{APP_VERSION}
              </p>
            </div>
          </div>
        )}
      </div>

      <ProfileEditDialog
        open={activeDialog === "profile"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
      />
      <NotificationSettingsDialog
        open={activeDialog === "notification"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
      />
      <FeedbackDialog
        open={activeDialog === "feedback"}
        onOpenChange={(isOpen) => !isOpen && setActiveDialog(null)}
      />
    </>
  )
}
