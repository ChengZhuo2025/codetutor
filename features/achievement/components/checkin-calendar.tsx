import { Flame, Zap } from "lucide-react"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import { cn } from "@/lib/utils"

type CheckinCalendarProps = {
  weekDays: string[]
  checkinDays: boolean[][]
  calendarDates: number[][]
  streakDays: number
  monthlyXP: number
  totalCheckinDays: number
  checkedInToday: boolean
  isSubmitting?: boolean
  onCheckIn?: () => void
}

export function CheckinCalendar({
  weekDays,
  checkinDays,
  calendarDates,
  streakDays,
  monthlyXP,
  totalCheckinDays,
  checkedInToday,
  isSubmitting = false,
  onCheckIn,
}: CheckinCalendarProps) {
  const checkedCount = checkinDays.flat().filter(Boolean).length
  const hasCalendar =
    weekDays.length > 0 && checkinDays.length > 0 && calendarDates.length > 0
  const weeklyBest = Math.max(...checkinDays.map((week) => week.filter(Boolean).length), 0)

  if (!hasCalendar) {
    return (
      <StatePanel
        status="empty"
        title="还没有打卡记录"
        description="开始连续学习后，这里会展示最近的打卡分布和本月 XP 积累。"
      />
    )
  }

  return (
    <PageSection
      eyebrow="打卡记录"
      title="近四月打卡日历"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-2xl border border-gold/20 bg-gold-dim px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-bold text-gold">
              <Flame className="h-4 w-4" />
              {streakDays} 天连续
            </div>
          </div>
          <button
            type="button"
            onClick={onCheckIn}
            disabled={checkedInToday || isSubmitting || !onCheckIn}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-semibold transition-colors",
              checkedInToday
                ? "cursor-not-allowed border border-brand/20 bg-brand/10 text-brand"
                : "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            {isSubmitting ? "打卡中..." : checkedInToday ? "今日已打卡" : "立即打卡"}
          </button>
        </div>
      }
      description="每天打卡积累连续天数，连续天数越长可解锁更高奖励。"
      bodyClassName="space-y-5"
    >
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-[24px] border border-border/50 bg-surface-3 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            本月打卡
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{checkedCount} 天</p>
        </div>
        <div className="rounded-[24px] border border-border/50 bg-surface-3 px-4 py-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            <Zap className="h-3.5 w-3.5 text-brand" />
            本月获取
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{monthlyXP} XP</p>
        </div>
        <div className="rounded-[24px] border border-border/50 bg-surface-3 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            单周最佳
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{weeklyBest} 天</p>
        </div>
        <div className="rounded-[24px] border border-border/50 bg-surface-3 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            累计打卡
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalCheckinDays} 天</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/50 bg-surface-3/80 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
              本月分布
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              绿色圆点标记的日期为已打卡，连续打卡可维持连续学习记录。
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              已打卡
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-4" />
              未打卡
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-7 gap-2 px-0.5">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground/60">
                {day}
              </div>
            ))}
          </div>

          {checkinDays.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((checked, dayIndex) => {
                const isFuture = weekIndex === checkinDays.length - 1 && dayIndex > 0

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative flex aspect-square items-end justify-start rounded-2xl border p-2 transition-colors sm:p-2.5",
                      checked
                        ? "border-brand/35 bg-brand/15"
                        : isFuture
                          ? "border-border/10 bg-surface-3"
                          : "border-border/60 bg-background/25",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-medium leading-none sm:text-xs",
                        checked
                          ? "text-brand"
                          : isFuture
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground/55",
                      )}
                    >
                      {calendarDates[weekIndex][dayIndex]}
                    </span>
                    {checked && (
                      <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  )
}
