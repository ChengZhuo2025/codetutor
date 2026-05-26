import { Flame, Zap } from "lucide-react"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"
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
  const statCardClass =
    "rounded-[20px] border border-border/70 bg-surface-2 px-3 py-3 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5 sm:rounded-[24px] sm:px-4 sm:py-4"

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
      id="checkin-records"
      eyebrow="打卡记录"
      title="近四月打卡日历"
      action={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
              "min-h-11 w-full px-4 py-2 text-sm font-semibold sm:w-auto",
              checkedInToday
                ? USER_BUTTON_SECONDARY_CLASS
                : USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            {isSubmitting ? "打卡中..." : checkedInToday ? "今日已打卡" : "立即打卡"}
          </button>
        </div>
      }
      description="每天打卡积累连续天数，连续天数越长可解锁更高奖励。"
      bodyClassName="space-y-5"
      className="border-border/70 bg-surface-1/95 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            本月打卡
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{checkedCount} 天</p>
        </div>
        <div className={statCardClass}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            <Zap className="h-3.5 w-3.5 text-brand" />
            本月获取
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{monthlyXP} XP</p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            单周最佳
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{weeklyBest} 天</p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60">
            累计打卡
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{totalCheckinDays} 天</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-border/70 bg-surface-1/95 p-3 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5 sm:rounded-[28px] sm:p-5">
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

        <div className="space-y-1.5 sm:space-y-2.5">
          <div className="grid grid-cols-7 gap-1.5 px-0.5 sm:gap-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground/60">
                {day}
              </div>
            ))}
          </div>

          {checkinDays.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {week.map((checked, dayIndex) => {
                const isFuture = weekIndex === checkinDays.length - 1 && dayIndex > 0

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative flex aspect-square items-end justify-start rounded-xl border p-1.5 transition-colors sm:rounded-2xl sm:p-2.5",
                      checked
                        ? "border-brand/35 bg-brand/15 dark:bg-brand/20"
                        : isFuture
                          ? "border-border bg-surface-3 dark:border-white/12"
                          : "border-border/80 bg-surface-2 dark:border-white/12",
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
