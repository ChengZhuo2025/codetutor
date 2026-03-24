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
}

export function CheckinCalendar({
  weekDays,
  checkinDays,
  calendarDates,
  streakDays,
  monthlyXP,
}: CheckinCalendarProps) {
  const checkedCount = checkinDays.flat().filter(Boolean).length
  const hasCalendar =
    weekDays.length > 0 && checkinDays.length > 0 && calendarDates.length > 0

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
      title="连续成长比爆发式学习更值钱"
      action={
        <div className="rounded-2xl border border-gold/20 bg-gold-dim px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gold">
            <Flame className="h-4 w-4" />
            {streakDays} 天连续
          </div>
        </div>
      }
    >
      <div className="mb-5 flex flex-col gap-4">

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-surface-3 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              本月打卡
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{checkedCount} 天</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface-3 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              <Zap className="h-3.5 w-3.5 text-brand" />
              本月获取
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{monthlyXP} XP</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1.5 px-0.5">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs text-muted-foreground/60">
              {day}
            </div>
          ))}
        </div>

        {checkinDays.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
            {week.map((checked, dayIndex) => {
              const isFuture = weekIndex === 3 && dayIndex > 0

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "relative flex aspect-square items-end justify-start rounded-xl p-1 transition-colors sm:p-1.5",
                    checked
                      ? "bg-brand/25 shadow-[0_0_10px_oklch(0.78_0.15_180/0.25)]"
                      : isFuture
                        ? "bg-surface-3/20"
                        : "bg-surface-3",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none sm:text-[11px]",
                      checked
                        ? "text-brand"
                        : isFuture
                          ? "text-muted-foreground/30"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {calendarDates[weekIndex][dayIndex]}
                  </span>
                  {checked && (
                    <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </PageSection>
  )
}
