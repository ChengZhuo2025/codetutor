import { RotateCcw, CheckCircle2, Lock, Play, Sparkles } from "lucide-react";
import { USER_BUTTON_PRIMARY_CLASS } from "@/components/ui/surface-styles";
import { cn } from "@/lib/utils";
import type { Stage } from "@/features/progress/types";

const statusConfig = {
  done: {
    icon: CheckCircle2,
    nodeStyle:
      "border-emerald-500/45 bg-emerald-500 text-white shadow-[0_0_0_6px_rgba(16,185,129,0.10)]",
    cardStyle:
      "border-emerald-500/20 bg-emerald-500/10 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.18)] hover:border-emerald-500/35 dark:border-emerald-300/24 dark:bg-emerald-500/14",
    label: "已完成",
    labelStyle: "text-emerald-700 dark:text-emerald-300",
  },
  current: {
    icon: Play,
    nodeStyle:
      "border-brand bg-brand text-brand-foreground shadow-[0_0_30px_oklch(0.73_0.21_270/0.5)]",
    cardStyle:
      "border-brand/60 bg-brand/8 dark:border-brand/50 dark:bg-[linear-gradient(145deg,rgba(98,92,255,0.16),rgba(8,16,29,0.94))] dark:shadow-[0_24px_64px_-32px_oklch(0.73_0.21_270/0.55)]",
    label: "当前任务",
    labelStyle: "text-brand",
  },
  locked: {
    icon: Lock,
    nodeStyle:
      "border-border/50 bg-surface-2 text-muted-foreground/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
    cardStyle:
      "border-border/70 bg-surface-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.16)] opacity-90 hover:opacity-100 dark:border-white/10 dark:bg-white/5",
    label: "未解锁",
    labelStyle: "text-muted-foreground/65",
  },
} as const;

type StageTimelineProps = {
  stages: Stage[];
  currentStageId: number;
  selectedId: number;
  onSelect: (id: number) => void;
  onStageClick?: (stage: Stage) => void;
  onOpenLearning: () => void;
  onOpenReview: (stage: Stage) => void;
};

export function StageTimeline({
  stages,
  currentStageId,
  selectedId,
  onSelect,
  onStageClick,
  onOpenLearning,
  onOpenReview,
}: StageTimelineProps) {
  const nextLockedStageId = stages.find(
    (stage) => stage.id > currentStageId,
  )?.id;

  return (
    <div className="flex min-w-0 flex-col py-4 sm:py-5">
      <div className="relative">
        {stages.map((stage, idx) => {
          const cfg = statusConfig[stage.status];
          const Icon = cfg.icon;
          const isSelected = stage.id === selectedId;
          const isNext = stage.id === nextLockedStageId;

          return (
            <div
              key={stage.id}
              className="group relative flex w-full gap-2.5 sm:gap-3.5"
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:h-12 sm:w-12",
                    cfg.nodeStyle,
                    isSelected &&
                      "ring-2 ring-brand/28 ring-offset-2 ring-offset-background",
                  )}
                >
                  <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-border/70 bg-surface-1 px-1 text-[9px] font-bold text-foreground shadow-sm dark:border-white/10 dark:bg-[oklch(0.22_0.015_270/0.98)] sm:-left-1.5 sm:-top-1.5 sm:h-5 sm:min-w-5 sm:text-[10px]">
                    {stage.id}
                  </span>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      stage.status === "done"
                        ? "bg-emerald-500/45"
                        : stage.status === "current"
                        ? "bg-brand/40"
                        : "bg-border/40",
                    )}
                    style={{ minHeight: "26px" }}
                  />
                )}
              </div>

              <div
                className={cn(
                  "relative mb-4 flex-1 rounded-[28px] border p-4 transition-all",
                  cfg.cardStyle,
                  isSelected ? "ring-2 ring-brand/20" : "",
                )}
              >
                <div className="absolute right-3 top-3 z-10 flex shrink-0 items-center gap-1 rounded-full border border-gold/20 bg-gold-dim px-2.5 py-1 text-xs font-semibold text-gold">
                  + {stage.xp} XP
                </div>
                <button
                  type="button"
                  className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => {
                    onSelect(stage.id);
                    onStageClick?.(stage);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(stage.id);
                      onStageClick?.(stage);
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/65">
                        第 {stage.id} 关
                      </span>
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          cfg.labelStyle,
                        )}
                      >
                        {cfg.label}
                      </span>
                      {isNext && stage.status === "locked" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-chart-3/25 bg-chart-3/10 px-2 py-0.5 text-[12px] font-medium text-chart-3">
                          <Sparkles className="h-3 w-3" />
                          下一关
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[1.05rem] font-semibold text-foreground">
                      {stage.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5.5 text-muted-foreground">
                      {stage.summary}
                    </p>
                  </div>
                </button>

                <div
                  className={cn(
                    "mt-3 border-t pt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                    stage.status === "done"
                      ? "border-emerald-500/20"
                      : "border-brand/20",
                  )}
                >
                  <p className="text-sm leading-5.5 text-foreground/78 line-clamp-1">
                    {stage.status === "done"
                      ? stage.reviewSummary
                      : stage.status === "current"
                        ? stage.goal
                        : (stage.unlockHint ??
                          "完成前一关后即可查看本关复盘与学习内容。")}
                  </p>

                  {stage.status === "current" ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenLearning();
                      }}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold",
                        USER_BUTTON_PRIMARY_CLASS,
                      )}
                    >
                      <Play className="h-3.5 w-3.5" />
                      继续学习
                    </button>
                  ) : stage.status === "done" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(stage.id);
                        onStageClick?.(stage);
                        onOpenReview(stage);
                      }}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-emerald-300/24 dark:bg-emerald-500/14 dark:text-emerald-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      学习复盘
                    </button>
                  ) : (
                    <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3.5 py-2 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <Lock className="h-3.5 w-3.5" />
                      解锁条件
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
