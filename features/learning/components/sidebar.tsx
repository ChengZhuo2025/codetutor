"use client"

import Link from "next/link"
import {
  Code2,
  Flame,
  Star,
} from "lucide-react"
import {
  learningNavItems,
  recentSessions,
} from "@/features/learning/data/learning-content"
import { cn } from "@/lib/utils"
import { SettingsPopover } from "@/components/ui/settings-popover"

export function LearnSidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">CodeTutor</span>
      </div>

      {/* User rank card */}
      <div className="mx-4 mt-4 rounded-xl border border-border/50 bg-surface-3 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dim text-sm font-bold text-brand">
            陈
          </div>
          <div>
            <p className="text-sm font-semibold">陈小明</p>
            <p className="text-xs text-brand">Vibe Coder</p>
          </div>
        </div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">680 / 1000 XP</span>
          <span className="text-muted-foreground">68%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
          <div className="h-full w-[68%] rounded-full bg-brand" />
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface-3 px-3 py-2.5">
          <Flame className="h-4 w-4 text-gold" />
          <div>
            <p className="text-xs text-muted-foreground">连续</p>
            <p className="text-sm font-bold text-gold">7 天</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface-3 px-3 py-2.5">
          <Star className="h-4 w-4 text-brand" />
          <div>
            <p className="text-xs text-muted-foreground">已完成</p>
            <p className="text-sm font-bold">14 关</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1 space-y-1 px-3">
        {learningNavItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-brand-dim text-brand"
                  : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Recent sessions */}
      <div className="border-t border-border/50 px-4 py-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          历史记录
        </p>
        <div className="space-y-1">
          {recentSessions.map((s) => (
            <button
              key={s.title}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-surface-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    s.done ? "bg-brand" : "bg-muted-foreground/40"
                  )}
                />
                <span className="truncate text-muted-foreground">{s.title}</span>
              </div>
              <span className="ml-2 shrink-0 text-muted-foreground/50">{s.time}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 p-4">
        <SettingsPopover />
      </div>
    </aside>
  )
}
