import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Rank } from "@/features/achievement/types"

type RankProgressCardProps = {
  currentXP: number
  currentRankIdx: number
  ranks: Rank[]
}

export function RankProgressCard({
  currentXP,
  currentRankIdx,
  ranks,
}: RankProgressCardProps) {
  const currentRank = ranks[currentRankIdx]
  const nextRank = ranks[currentRankIdx + 1]
  const progress =
    ((currentXP - currentRank.min) / (currentRank.max - currentRank.min)) * 100

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/20 bg-brand-dim">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              当前段位
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand/40 bg-brand/10 text-2xl">
                {"</"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-brand">{currentRank.name}</h2>
                <p className="text-sm text-muted-foreground">{currentXP} XP</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              下一段位
            </p>
            <p className="font-semibold text-chart-3">{nextRank.name}</p>
            <p className="text-sm text-muted-foreground">
              还需 <span className="font-bold text-foreground">{nextRank.min - currentXP}</span> XP
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {currentRank.name} ({currentRank.min})
            </span>
            <span>
              {nextRank.name} ({nextRank.min})
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-4">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs font-medium text-brand">
            {Math.round(progress)}% 完成
          </p>
        </div>
      </div>

      <div className="border-t border-border/30 px-6 py-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {ranks.map((rank, index) => (
            <div key={rank.name} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  index === currentRankIdx
                    ? "border-brand bg-brand text-brand-foreground"
                    : index < currentRankIdx
                      ? "border-brand/30 text-muted-foreground"
                      : "border-border/30 text-muted-foreground/40",
                )}
              >
                {index < currentRankIdx && <CheckCircle2 className="h-3 w-3" />}
                {rank.name}
              </div>
              {index < ranks.length - 1 && (
                <div className="h-px w-4 shrink-0 bg-border/40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
