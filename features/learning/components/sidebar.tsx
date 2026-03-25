"use client"

import Link from "next/link"
import { BookMarked, CheckCircle2, ChevronRight, Code2, Flame, Sparkles, Target } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { SettingsPopover } from "@/components/layout/settings-popover"
import { getLearningPageMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"

type LearnSidebarProps = {
  mobile?: boolean
}

export function LearnSidebar({ mobile = false }: LearnSidebarProps) {
  const { mission, profile, task, resume } = getLearningPageMock()
  const progressPercent = Math.min(Math.round((profile.currentScore / 1000) * 100), 100)
  const navItems = getDashboardNavItems(ROUTES.learn)

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar",
        mobile ? "w-full" : "w-72",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{APP_NAME}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">
            学习工作台
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-4">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border/60 bg-surface-2/85 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-dim text-sm font-bold text-brand">
                {profile.nickname.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{profile.nickname}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {mission?.tool ?? profile.primaryToolName} · {mission?.stageLabel ?? "当前学习中"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/50 bg-background/45 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                <Target className="h-3.5 w-3.5 text-brand" />
                当前进度
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{task.title}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{profile.currentScore} / 1000 XP</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-4">
                <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/50 bg-background/45 px-3 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-gold" />
                  连续学习
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{profile.streakDays} 天</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/45 px-3 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                  已完成
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{profile.completedTaskCount} 关</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 rounded-[24px] border border-border/60 bg-surface-2/80 p-2">
            {navItems.map((item) => {
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
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              <BookMarked className="h-3.5 w-3.5 text-chart-3" />
              继续学习
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{resume?.title ?? "当前任务"}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {resume?.summary ?? "回到当前学习任务，继续完成这一关。"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{resume?.lastSeenLabel ?? "刚刚更新"}</span>
              <Link
                href={ROUTES.map}
                className="flex items-center gap-1 text-brand transition-colors hover:text-brand/80"
              >
                看路径
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-surface-2/70 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              学习提示
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先完成当前一步，再去看完整路径和下一关。你不需要一次理解所有功能。
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 px-4 py-2.5">
        <SettingsPopover />
      </div>
    </aside>
  )
}
