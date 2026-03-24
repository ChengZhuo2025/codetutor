import { cn } from "@/lib/utils"
import type { StatItem } from "@/features/achievement/types"

type AchievementStatsGridProps = {
  stats: StatItem[]
}

export function AchievementStatsGrid({ stats }: AchievementStatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.label}
            className="rounded-[28px] border border-border/60 bg-surface-2 px-5 py-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
                  {stat.label}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-surface-3">
                <Icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{stat.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
