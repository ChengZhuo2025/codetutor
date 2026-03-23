import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

type CheckinCalendarProps = {
  weekDays: string[]
  checkinDays: boolean[][]
  calendarDates: number[][]
}

export function CheckinCalendar({
  weekDays,
  checkinDays,
  calendarDates,
}: CheckinCalendarProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">打卡记录</h3>
        <div className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold-dim px-3 py-1.5">
          <Flame className="h-4 w-4 text-gold" />
          <span className="text-sm font-bold text-gold">7 天连续</span>
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
                    "relative flex aspect-square items-end justify-start rounded-lg p-1.5 transition-colors",
                    checked
                      ? "bg-brand/25 shadow-[0_0_6px_oklch(0.78_0.15_180/0.25)]"
                      : isFuture
                        ? "bg-surface-3/20"
                        : "bg-surface-3",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
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

      <p className="mt-3 text-xs text-muted-foreground">
        本月已打卡 <span className="font-semibold text-foreground">18</span> 天，获得{" "}
        <span className="font-semibold text-brand">360 XP</span>
      </p>
    </div>
  )
}
