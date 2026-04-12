import { BookMarked, Lock, Play, RotateCcw, Target, Zap } from "lucide-react";
import {
  WORKSPACE_ASIDE_INSET_CARD_CLASS,
  WorkspaceAside,
} from "@/components/layout/workspace-aside";
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles";
import { cn } from "@/lib/utils";
import type { Stage } from "@/features/progress/types";

type StageDetailPanelProps = {
  stage: Stage;
  onContinueLearning: () => void;
  onOpenReview: () => void;
};

export function StageDetailPanel({
  stage,
  onContinueLearning,
  onOpenReview,
}: StageDetailPanelProps) {
  const isCurrent = stage.status === "current";
  const isDone = stage.status === "done";
  const isLocked = stage.status === "locked";
  const ctaLabel = isCurrent
    ? "继续学习"
    : isDone
      ? "学习复盘"
      : "完成前一关后解锁";

  return (
    <WorkspaceAside as="div">
      <div className="sticky top-0 space-y-4">
        <div className="rounded-[28px] border border-border/60 bg-surface-2 px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <BookMarked
              className={cn("h-4 w-4", isDone ? "text-gold" : "text-brand")}
            />
            <span className="text-sm font-semibold text-foreground">
              {isCurrent
                ? "当前任务摘要"
                : isDone
                  ? "学习复盘摘要"
                  : "未解锁任务预览"}
            </span>
            <span className="rounded-full border border-border/70 bg-surface-1/95 px-2 py-0.5 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              第 {stage.id} 关
            </span>
          </div>

          <div className="gap-2">
            <p className="text-lg font-semibold text-foreground">
              {stage.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              {stage.summary}
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                <Target className="h-3.5 w-3.5 text-brand" />
                本关目标
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/85">
                {stage.goal}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  预计时长
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {stage.estimatedTime}
                </p>
              </div>
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <Zap className="h-3.5 w-3.5 text-gold" />
                  成长奖励
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  +{stage.xp} XP
                </p>
              </div>
            </div>

            <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                {isDone ? "复盘重点" : isLocked ? "解锁条件" : "完成标准"}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/85">
                {isDone
                  ? stage.reviewSummary
                  : isLocked
                    ? (stage.unlockHint ?? "完成上一关后可进入本关。")
                    : stage.completionCriteria}
              </p>
            </div>

            <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground/60">
                {isDone
                  ? "你已学会"
                  : isLocked
                    ? "进入前会学到"
                    : "进入学习页后你会做什么"}
              </p>
              <ul className="mt-2 space-y-2">
                {stage.keyPoints.slice(0, 3).map((point) => (
                  <li
                    key={point}
                    className="flex gap-2 text-sm leading-6 text-foreground/85"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {stage.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-surface-1/95 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={isDone ? onOpenReview : onContinueLearning}
            disabled={isLocked}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold",
              isLocked
                ? USER_BUTTON_SECONDARY_CLASS
                : USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            {isCurrent ? (
              <Play className="h-4 w-4" />
            ) : isDone ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {ctaLabel}
          </button>
        </div>
      </div>
    </WorkspaceAside>
  );
}
