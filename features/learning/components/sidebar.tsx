"use client"

import { Flame, Star, Target } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { getLearningPageMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"

type LearnSidebarProps = {
  mobile?: boolean
}

export function LearnSidebar({ mobile = false }: LearnSidebarProps) {
  const { mission, profile, recentSessions } = getLearningPageMock()
  const progressPercent = Math.min(Math.round((profile.currentScore / 1000) * 100), 100)

  return (
    <DashboardSidebar
      items={getDashboardNavItems(ROUTES.learn)}
      widthClass={mobile ? "w-full" : "w-72"}
      footerContent={
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            最近学习记录
          </p>
          <div className="space-y-1">
            {recentSessions.map((session) => (
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
      }
    >
      <div className="rounded-[24px] border border-border/50 bg-surface-3 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-dim text-sm font-bold text-brand">
            {profile.nickname.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.nickname}</p>
            <p className="truncate text-xs text-brand">
              {profile.currentRank} · {APP_NAME}
            </p>
          </div>
        </div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{profile.currentScore} / 1000 XP</span>
          <span className="text-muted-foreground">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {mission ? (
        <div className="rounded-[24px] border border-brand/20 bg-brand-dim/55 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/80">
            <Target className="h-3.5 w-3.5" />
            当前训练焦点
          </div>
          <p className="text-sm font-semibold text-foreground">{mission.goal}</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{mission.summary}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface-3 px-3 py-2.5">
          <Flame className="h-4 w-4 text-gold" />
          <div>
            <p className="text-[11px] text-muted-foreground">连续学习</p>
            <p className="text-sm font-bold text-gold">{profile.streakDays} 天</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface-3 px-3 py-2.5">
          <Star className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[11px] text-muted-foreground">已完成</p>
            <p className="text-sm font-bold">{profile.completedTaskCount} 关</p>
          </div>
        </div>
      </div>
    </DashboardSidebar>
  )
}
