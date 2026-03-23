"use client"

import { useState, useRef, useEffect } from "react"
import { Settings, User, Bell, Moon, LogOut, ChevronRight, X } from "lucide-react"
import { APP_NAME, APP_VERSION } from "@/constants/app"
import { cn } from "@/lib/utils"

const settingsItems = [
  {
    group: "账户",
    items: [
      { icon: User, label: "个人资料", desc: "修改头像、用户名" },
      { icon: Bell, label: "通知设置", desc: "打卡提醒、进度推送" },
    ],
  },
  {
    group: "偏好",
    items: [
      { icon: Moon, label: "外观", desc: "始终深色模式" },
    ],
  },
  {
    group: "账号",
    items: [
      { icon: LogOut, label: "退出登录", desc: "注销当前账号", danger: true },
    ],
  },
]

export function SettingsPopover() {
  const [open, setOpen] = useState(false)
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
          open
            ? "bg-surface-3 text-foreground"
            : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
        )}
      >
        <Settings className="h-4 w-4" />
        设置
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-2xl border border-border/60 bg-surface-2 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-semibold">设置</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Items */}
          <div className="py-2">
            {settingsItems.map((group) => (
              <div key={group.group}>
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.group}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-3",
                        (item as { danger?: boolean }).danger
                          ? "text-destructive hover:bg-destructive/10"
                          : "text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                      {!(item as { danger?: boolean }).danger && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Version */}
          <div className="border-t border-border/40 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground/50">{APP_NAME} v{APP_VERSION}</p>
          </div>
        </div>
      )}
    </div>
  )
}
