import { AlertTriangle, ArrowRight, BookMarked, Lightbulb, Play, Zap } from "lucide-react"
import {
  WORKSPACE_ASIDE_BRAND_CARD_CLASS,
  WORKSPACE_ASIDE_CARD_CLASS,
  WORKSPACE_ASIDE_GOLD_CARD_CLASS,
  WORKSPACE_ASIDE_INSET_CARD_CLASS,
  WorkspaceAside,
} from "@/components/layout/workspace-aside"
import { cn } from "@/lib/utils"
import type { Stage } from "@/features/progress/types"

type StageDetailPanelProps = {
  stage: Stage
  onContinueLearning: () => void
}

export function StageDetailPanel({
  stage,
  onContinueLearning,
}: StageDetailPanelProps) {
  const ctaLabel =
    stage.status === "current"
      ? "回到当前关卡继续学习"
      : stage.status === "available"
        ? "开始这一关"
        : stage.status === "done"
          ? "回顾本关要点"
          : "完成前置关卡后解锁"

  return (
    <WorkspaceAside as="div">
      <div className="sticky top-0 space-y-4">
        <div className={WORKSPACE_ASIDE_BRAND_CARD_CLASS}>
          <div className="mb-3 flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-foreground">关卡详情</span>
            <span className="rounded-full bg-background/55 px-2 py-0.5 text-xs text-muted-foreground">
              第 {stage.id} 关
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{stage.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{stage.desc}</p>
            </div>
            <div className="rounded-full border border-gold/20 bg-gold-dim px-2.5 py-1 text-xs font-semibold text-gold">
              +{stage.xp} XP
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                本关目标
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{stage.focus}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  预计时长
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{stage.estimatedTime}</p>
              </div>
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  成长奖励
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">+{stage.xp} XP</p>
              </div>
            </div>
          </div>

          <button
            onClick={onContinueLearning}
            disabled={stage.status === "locked"}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors",
              stage.status === "locked"
                ? "cursor-not-allowed bg-surface-3 text-muted-foreground/50"
                : stage.status === "available"
                  ? "bg-chart-3/12 text-chart-3 hover:bg-chart-3/18"
                  : "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            {stage.status === "current" ? <Play className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {ctaLabel}
          </button>
        </div>

        <div className={WORKSPACE_ASIDE_CARD_CLASS}>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              本关要掌握
            </span>
          </div>
          <ul className="space-y-2.5">
            {stage.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                  {index + 1}
                </div>
                <span className="text-sm leading-6 text-foreground/85">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={WORKSPACE_ASIDE_CARD_CLASS}>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive/80">
              注意事项
            </span>
          </div>
          <ul className="space-y-2.5">
            {stage.pitfalls.map((pitfall, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    pitfall.isTrap ? "bg-destructive" : "bg-muted-foreground/50",
                  )}
                />
                <div className="flex-1">
                  {pitfall.isTrap && (
                    <span className="mr-1.5 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      卡点提醒
                    </span>
                  )}
                  <span className="text-sm leading-6 text-foreground/80">{pitfall.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={WORKSPACE_ASIDE_GOLD_CARD_CLASS}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            <Zap className="h-3.5 w-3.5" />
            成长反馈
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">
            完成这一关后会直接增加 {stage.xp} XP，并推动下一关解锁。保持连续学习时，成长反馈会更明显。
          </p>
        </div>
      </div>
    </WorkspaceAside>
  )
}
