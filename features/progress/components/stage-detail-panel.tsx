import { ArrowRight, BookMarked, Play, Target } from "lucide-react"
import {
  WORKSPACE_ASIDE_BRAND_CARD_CLASS,
  WORKSPACE_ASIDE_CARD_CLASS,
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
            <span className="text-sm font-semibold text-foreground">关卡预览</span>
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
            <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                <Target className="h-3.5 w-3.5 text-brand" />
                当前状态
              </div>
              <p className="text-sm leading-6 text-foreground">
                {stage.status === "current"
                  ? "这是你当前正在推进的关卡，进入学习页后会看到本关要掌握和注意事项。"
                  : stage.status === "available"
                    ? "这关已经可以开始。进入学习页后，右侧会展开完整的执行上下文。"
                    : stage.status === "done"
                      ? "这关已经完成，可以回顾重点后继续下一关。"
                      : "还需先完成前置关卡，解锁后再进入学习执行阶段。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {stage.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/50 bg-background/45 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
            为什么这里不展开细节
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground/82">
            路径地图负责帮你判断“现在该进哪一关”，真正进入学习后，右侧会展示本关要掌握、注意事项和下一步提示，避免在地图页提前堆叠过多执行信息。
          </p>
        </div>
      </div>
    </WorkspaceAside>
  )
}
