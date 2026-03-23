import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Badge } from "@/features/achievement/types"

type BadgeGridProps = {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">成就徽章</h3>
        <span className="text-sm text-muted-foreground">
          {badges.filter((badge) => badge.earned).length} / {badges.length} 已获得
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const Icon = badge.icon

          return (
            <div
              key={badge.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4",
                badge.color,
                !badge.earned && "opacity-50",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/5">
                {badge.earned ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{badge.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-70">
                  {badge.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
