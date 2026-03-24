import { ArrowRight, CheckCircle2, Flame, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AchievementOverview, Rank } from "@/features/achievement/types"

type RankProgressCardProps = {
  currentXP: number
  currentRankIdx: number
  ranks: Rank[]
  overview: AchievementOverview
  onContinueLearning: () => void
  onOpenMap: () => void
}

export function RankProgressCard({
  currentXP,
  currentRankIdx,
  ranks,
  overview,
  onContinueLearning,
  onOpenMap,
}: RankProgressCardProps) {
  const currentRank = ranks[currentRankIdx]
  const nextRank = ranks[currentRankIdx + 1]
  const progress =
    ((currentXP - currentRank.min) / (currentRank.max - currentRank.min)) * 100

  return (
    <div className="overflow-hidden rounded-[32px] border border-brand/20 bg-brand-dim/80">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand/80">
            当前段位
          </p>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border-2 border-brand/40 bg-background/55 text-2xl">
              {"</"}
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand">{currentRank.name}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                你已经累计 {overview.totalXP} XP，并保持了 {overview.streakDays} 天连续学习。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-background/40 bg-background/55 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                <Zap className="h-3.5 w-3.5 text-brand" />
                总 XP
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{overview.totalXP} XP</p>
            </div>
            <div className="rounded-2xl border border-background/40 bg-background/55 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                <Flame className="h-3.5 w-3.5 text-gold" />
                连续学习
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{overview.streakDays} 天</p>
            </div>
            <div className="rounded-2xl border border-background/40 bg-background/55 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                已获徽章
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {overview.earnedBadges} 枚
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
            <div className="h-3 w-full overflow-hidden rounded-full bg-background/55">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                距离 <span className="font-semibold text-foreground">{nextRank.name}</span> 还差{" "}
                <span className="font-semibold text-brand">{overview.nextRankRemainingXP} XP</span>
              </p>
              <p className="text-xs font-medium text-brand">{Math.round(progress)}% 完成</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-background/40 bg-background/55 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            下一步最值得做的事
          </p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">
            回到当前关卡继续学习
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            继续当前学习路径最容易同时推进 XP、段位和连续学习天数，比单独查看数据更能带来真实成长。
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={onContinueLearning}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-semibold text-brand-foreground shadow-[0_24px_60px_-28px_oklch(0.78_0.15_180/0.9)] transition-all hover:-translate-y-0.5 hover:bg-brand/90"
            >
              继续学习赚 XP
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenMap}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface-2 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-1"
            >
              查看闯关地图
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 px-5 py-4 sm:px-6">
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
