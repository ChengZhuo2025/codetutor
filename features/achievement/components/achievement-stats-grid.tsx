import { cn } from "@/lib/utils"
import type { StatItem } from "@/features/achievement/types"

type AchievementStatsGridProps = {
  stats: StatItem[]
}

export function AchievementStatsGrid({ stats }: AchievementStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-2 py-6 text-center"
          >
            <Icon className={cn("mb-2 h-6 w-6", stat.color)} />
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.unit}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}
