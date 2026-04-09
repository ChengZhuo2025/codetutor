import {
  RotateCcw,
  CheckCircle2,
  Lock,
  Play,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/features/progress/types"

const statusConfig = {
  done: {
    icon: CheckCircle2,
    nodeStyle: "border-brand/55 bg-brand text-brand-foreground shadow-[0_0_0_6px_rgba(92,225,168,0.08)]",
    cardStyle: "border-brand/20 bg-brand-dim/22 hover:border-brand/35 cursor-pointer",
    label: "已完成",
    labelStyle: "text-brand",
  },
  current: {
    icon: Play,
    nodeStyle:
      "border-brand bg-brand text-brand-foreground shadow-[0_0_30px_oklch(0.78_0.15_180/0.5)]",
    cardStyle:
      "border-brand/40 bg-brand/10 shadow-sm dark:border-brand/50 dark:bg-[linear-gradient(145deg,rgba(31,198,164,0.16),rgba(8,16,29,0.94))] dark:shadow-[0_24px_64px_-32px_oklch(0.78_0.15_180/0.55)] cursor-pointer",
    label: "当前任务",
    labelStyle: "text-brand",
  },
  locked: {
    icon: Lock,
    nodeStyle: "border-border/40 bg-surface-3 text-muted-foreground/45",
    cardStyle: "border-border/50 bg-surface-3/60 cursor-pointer opacity-80 hover:opacity-100",
    label: "未解锁",
    labelStyle: "text-muted-foreground/65",
  },
} as const

type StageTimelineProps = {
  stages: Stage[]
  currentStageId: number
  selectedId: number
  onSelect: (id: number) => void
  onStageClick?: (stage: Stage) => void
  onOpenLearning: () => void
}

export function StageTimeline({
  stages,
  currentStageId,
  selectedId,
  onSelect,
  onStageClick,
  onOpenLearning,
}: StageTimelineProps) {
  const nextLockedStageId = stages.find((stage) => stage.id > currentStageId)?.id

  return (
    <div className="flex min-w-0 flex-col py-4 sm:py-5">
      <div className="relative">
        {stages.map((stage, idx) => {
          const cfg = statusConfig[stage.status]
          const Icon = cfg.icon
          const isSelected = stage.id === selectedId
          const isNext = stage.id === nextLockedStageId

          return (
            <div
              key={stage.id}
              className="group relative flex gap-3 sm:gap-3.5"
              onClick={() => {
                onSelect(stage.id)
                onStageClick?.(stage)
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    cfg.nodeStyle,
                    isSelected && "ring-2 ring-brand/28 ring-offset-2 ring-offset-background",
                  )}
                >
                  <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-card px-1 text-[10px] font-bold text-foreground shadow-sm dark:border-gray-800 dark:bg-background">
                    {stage.id}
                  </span>
                  <Icon className="h-5 w-5" />
                </div>
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      stage.status === "done" || stage.status === "current"
                        ? "bg-brand/40"
                        : "bg-border/40",
                    )}
                    style={{ minHeight: "26px" }}
                  />
                )}
              </div>

              <div
                className={cn(
                  "mb-4 flex-1 rounded-[28px] border p-4 transition-all",
                  cfg.cardStyle,
                  isSelected ? "ring-1 ring-brand/40" : "",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/65">
                        第 {stage.id} 关
                      </span>
                      <span className={cn("text-[12px]  font-medium", cfg.labelStyle)}>
                        {cfg.label}
                      </span>
                      {isNext && stage.status === "locked" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-chart-3/25 bg-chart-3/10 px-2 py-0.5 text-[12px] font-medium text-chart-3">
                          <Sparkles className="h-3 w-3" />
                          下一关
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[1.05rem] font-semibold text-foreground">{stage.title}</h3>
                    <p className="mt-1 text-sm leading-5.5 text-muted-foreground">{stage.summary}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-gold/20 bg-gold-dim px-2.5 py-1 text-xs font-semibold text-gold">
                    + {stage.xp} XP
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/55 px-2.5 py-1">
                    预计 {stage.estimatedTime}
                  </span>
                  {stage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-surface-3 px-2.5 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-5.5 text-foreground/78">
                    {stage.status === "done"
                      ? stage.reviewSummary
                      : stage.status === "current"
                        ? stage.goal
                        : stage.unlockHint ?? "完成前一关后即可查看本关复盘与学习内容。"}
                  </p>

                  {stage.status === "current" ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenLearning()
                      }}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                    >
                      <Play className="h-3.5 w-3.5" />
                      继续学习
                    </button>
                  ) : stage.status === "done" ? (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-brand/20 bg-background/45 px-3.5 py-2 text-sm font-medium text-brand">
                      <RotateCcw className="h-3.5 w-3.5" />
                      学习复盘
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-border/40 bg-background/35 px-3.5 py-2 text-sm text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      解锁条件
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
