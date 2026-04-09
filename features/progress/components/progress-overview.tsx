import { ArrowRight, Play, CheckCircle2, Target, Zap } from "lucide-react"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_HERO_CARD_CLASS,
  USER_PANEL_HERO_TOP_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import type { MapSummary, Stage } from "@/features/progress/types"

type ProgressOverviewProps = {
  done: number
  total: number
  summary: MapSummary
  currentStage: Stage
  nextStage?: Stage
  onContinueLearning: () => void
  onOpenAchievements: () => void
}

export function ProgressOverview({
  done,
  total,
  summary,
  currentStage,
  nextStage,
  onContinueLearning,
  onOpenAchievements,
}: ProgressOverviewProps) {
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0
  const rankProgressPercent = Math.round(
    (summary.totalXP / Math.max(summary.totalXP + summary.remainingXPToNextRank, 1)) * 100,
  )
  const insetPanelClass =
    "rounded-2xl border border-border/70 bg-surface-1/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
  const infoPillClass =
    "rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

  return (
    <div className="shrink-0 border-b border-border/30 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-3">
        <div
          className={cn(
            "overflow-hidden rounded-[28px]",
            USER_PANEL_HERO_CARD_CLASS,
          )}
        >
          <div className={cn(USER_PANEL_HERO_TOP_SECTION_CLASS, "px-4 py-5 sm:px-5")}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-brand/18 bg-brand-dim px-2.5 py-1 font-medium text-brand">
                      当前任务
                    </span>
                    <span className={infoPillClass}>
                      第 {currentStage.id} 关 / 共 {total} 关
                    </span>
                  </div>
                  <h2 className="mt-3 text-[1.5rem] font-bold leading-tight tracking-tight text-foreground">
                    {currentStage.title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {currentStage.summary}
                  </p>
                </div>

                <button
                  onClick={onContinueLearning}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 px-5 py-3 text-sm font-semibold",
                    USER_BUTTON_PRIMARY_CLASS,
                  )}
                >
                  继续学习
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-2.5 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                <div className={insetPanelClass}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                    <span>当前路径进度</span>
                    <span>{progressPercent}% 已完成</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={infoPillClass}>
                      已完成 {done} 关
                    </span>
                    <span className={infoPillClass}>
                      还剩 {total - done} 关
                    </span>
                    <span className={infoPillClass}>
                      预计 {currentStage.estimatedTime}
                    </span>
                  </div>
                </div>

                <div className={insetPanelClass}>
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                    <Zap className="h-3.5 w-3.5 text-gold" />
                    本关奖励
                  </div>
                  <p className="mt-1 text-base font-semibold text-foreground">+{currentStage.xp} XP</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    完成当前任务后自动记入
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="grid gap-2.5 pb-1 dark:border-brand/15 lg:grid-cols-3">
              <div className={cn(insetPanelClass, "px-3.5")}>
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <Play className="h-3.5 w-3.5 text-brand" />
                  当前目标
                </div>
                <p className="mt-1 text-sm leading-5 text-foreground/90">{currentStage.goal}</p>
              </div>
              <div className={cn(insetPanelClass, "px-3.5")}>
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                  完成标准
                </div>
                <p className="mt-1 text-sm leading-5 text-foreground/90">
                  {currentStage.completionCriteria}
                </p>
              </div>
              <div className={cn(insetPanelClass, "px-3.5")}>
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <Target className="h-3.5 w-3.5 text-chart-3" />
                  下一步解锁
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {nextStage ? `第 ${nextStage.id} 关 · ${nextStage.title}` : summary.nextRank}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {nextStage
                    ? "完成当前关卡后会自动进入下一步"
                    : `继续推进可更快接近 ${summary.nextRank}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={onOpenAchievements}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onOpenAchievements()
            }
          }}
          className="group flex cursor-pointer flex-col rounded-[28px] border border-border/70 bg-surface-2 px-4 py-4 hover:border-brand/30 hover:bg-brand/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:px-5"
        >
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                当前段位
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground transition-colors group-hover:text-brand">
                {summary.currentRank}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                再获得 {summary.remainingXPToNextRank} XP 即可进阶为{" "}
                <span className="font-medium text-brand dark:text-white">{summary.nextRank}</span>
              </p>
            </div>

            <div className="grid gap-2.5 md:grid-cols-3 lg:justify-self-end">
              <div className={insetPanelClass}>
                <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  连续学习
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{summary.streakDays} 天</p>
              </div>
              <div className={insetPanelClass}>
                <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  下一段位
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{summary.nextRank}</p>
              </div>
              <div className={insetPanelClass}>
                <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  升级还差
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {summary.remainingXPToNextRank} XP
                </p>
              </div>
            </div>
          </div>

          <div className={cn(insetPanelClass, "mt-5 pt-3 pb-4")}>
            <div className="flex items-center justify-between gap-3 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
              <span>距离下一段位</span>
              <span>{summary.totalXP} / {summary.totalXP + summary.remainingXPToNextRank} XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-brand transition-all group-hover:bg-brand/90"
                style={{ width: `${Math.max(rankProgressPercent, 14)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
