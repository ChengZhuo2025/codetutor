import { ArrowRight, Flame, Play, Zap } from "lucide-react"
import type { MapSummary, Stage } from "@/features/progress/types"

type ProgressOverviewProps = {
  done: number
  total: number
  summary: MapSummary
  currentStage: Stage
  onContinueLearning: () => void
}

export function ProgressOverview({
  done,
  total,
  summary,
  currentStage,
  onContinueLearning,
}: ProgressOverviewProps) {
  return (
    <div className="shrink-0 border-b border-border/40 px-4 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[28px] border border-brand/20 bg-brand-dim/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand/80">
                当前关卡
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {currentStage.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                {currentStage.focus}
              </p>
            </div>

            <div className="rounded-2xl border border-background/40 bg-background/55 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                当前路径进度
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {Math.round((done / total) * 100)}% 已完成
              </p>
              <p className="text-xs text-muted-foreground">
                已完成 {done} 关，还剩 {total - done} 关
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-background/55">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold-dim px-3 py-1 text-gold">
                <Zap className="h-3.5 w-3.5" />
                已累计 {summary.totalXP} XP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold-dim px-3 py-1 text-gold">
                <Flame className="h-3.5 w-3.5" />
                连续学习 {summary.streakDays} 天
              </span>
            </div>

            <button
              onClick={onContinueLearning}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-[0_24px_60px_-28px_oklch(0.78_0.15_180/0.9)] transition-all hover:-translate-y-0.5 hover:bg-brand/90"
            >
              <Play className="h-4 w-4" />
              继续当前关卡
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[28px] border border-border/60 bg-surface-2 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
              当前段位
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.currentRank}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              再获得 {summary.remainingXPToNextRank} XP 即可进入 {summary.nextRank}。
            </p>
          </div>
          <div className="rounded-[28px] border border-border/60 bg-surface-2 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
              下一步建议
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              先完成 {currentStage.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              这是当前最短闭环，能直接带来 XP、连续学习和下一关解锁。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
