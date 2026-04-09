import { cn } from "@/lib/utils"
import type { StatItem } from "@/features/achievement/types"

type AchievementStatsGridProps = {
  stats: StatItem[]
}

export function AchievementStatsGrid({ stats }: AchievementStatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.label}
            className="rounded-[28px] border border-border/70 bg-surface-1/95 px-5 py-5 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-white/5 dark:ring-white/6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
                  {stat.label}
                </p>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">{stat.unit}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <Icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground/85">{stat.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
