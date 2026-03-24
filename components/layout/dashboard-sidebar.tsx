"use client"

import Link from "next/link"
import {
  ChevronRight,
  Code2,
  Crown,
  Flame,
  Star,
} from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog"
import { SettingsPopover } from "@/components/ui/settings-popover"
import { getLearningPageMock, getWorkspaceSidebarMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"
import type { DashboardNavItem } from "@/types/navigation"

type DashboardSidebarProps = {
  items: DashboardNavItem[]
  widthClass?: string
  showSettings?: boolean
  className?: string
  children?: React.ReactNode
  footerContent?: React.ReactNode
}

export function DashboardSidebar({
  items,
  widthClass = "w-64",
  showSettings = true,
  className,
  children,
  footerContent,
}: DashboardSidebarProps) {
  const { profile, subscription } = getWorkspaceSidebarMock()
  const { recentSessions } = getLearningPageMock()
  const progressPercent = Math.min(Math.round((profile.currentScore / 1000) * 100), 100)
  const visibleSessions = recentSessions.slice(0, 5)

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar",
        widthClass,
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-[24px] border border-border/50 bg-surface-3 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dim text-sm font-bold text-brand">
                {profile.nickname.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {profile.nickname}
                </p>
                <p className="truncate text-xs text-brand">
                  {profile.currentRank} · {APP_NAME}
                </p>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{profile.currentScore} / 1000 XP</span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
              <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
            </div>

            <SubscriptionDetailDialog subscription={subscription}>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-background/75"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold-dim text-gold">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {subscription.planName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {subscription.remainingDays} 天后到期 · {subscription.planPriceLabel}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80">
                  详情
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </SubscriptionDetailDialog>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
                <Flame className="h-4 w-4 text-gold" />
                <div>
                  <p className="text-[11px] text-muted-foreground">连续学习</p>
                  <p className="text-sm font-bold text-gold">{profile.streakDays} 天</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
                <Star className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-[11px] text-muted-foreground">已完成</p>
                  <p className="text-sm font-bold">{profile.completedTaskCount} 关</p>
                </div>
              </div>
            </div>

          </div>

          <nav className="space-y-1 rounded-[24px] border border-border/60 bg-surface-2/80 p-2">
            {items.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-brand-dim text-brand"
                      : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
                最近对话
              </p>
              <Link
                href={ROUTES.learn}
                className="flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80"
              >
                查看更多
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {visibleSessions.map((session) => (
                <button
                  key={session.title}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left text-xs transition-colors hover:bg-surface-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        session.done ? "bg-brand" : "bg-muted-foreground/40",
                      )}
                    />
                    <span className="truncate text-muted-foreground">{session.title}</span>
                  </div>
                  <span className="ml-2 shrink-0 text-muted-foreground/55">{session.time}</span>
                </button>
              ))}
            </div>
          </div>

          {children ? <div className="space-y-3">{children}</div> : null}

          {footerContent ? (
            <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
              {footerContent}
            </div>
          ) : null}
        </div>
      </div>

      {showSettings && (
        <div className="shrink-0 border-t border-border/50 px-4 py-2.5">
          <SettingsPopover />
        </div>
      )}
    </aside>
  )
}
