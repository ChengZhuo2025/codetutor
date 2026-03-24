import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Lock,
  Play,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/features/progress/types"

const statusConfig = {
  done: {
    icon: CheckCircle2,
    nodeStyle: "border-brand bg-brand text-brand-foreground",
    cardStyle: "border-brand/20 bg-brand-dim/20",
    label: "已完成",
    labelStyle: "text-brand",
  },
  current: {
    icon: Play,
    nodeStyle:
      "border-brand bg-brand text-brand-foreground shadow-[0_0_30px_oklch(0.78_0.15_180/0.5)]",
    cardStyle:
      "border-brand/45 bg-brand-dim shadow-[0_24px_56px_-30px_oklch(0.78_0.15_180/0.55)] cursor-pointer",
    label: "当前关卡",
    labelStyle: "text-brand",
  },
  available: {
    icon: ChevronRight,
    nodeStyle: "border-chart-3/40 bg-chart-3/10 text-chart-3",
    cardStyle:
      "border-chart-3/25 bg-surface-2 hover:-translate-y-0.5 hover:border-chart-3/40 cursor-pointer",
    label: "可开始",
    labelStyle: "text-chart-3",
  },
  locked: {
    icon: Lock,
    nodeStyle: "border-border/40 bg-surface-3 text-muted-foreground/40",
    cardStyle: "border-border/30 bg-surface-2/50 opacity-55",
    label: "待解锁",
    labelStyle: "text-muted-foreground/50",
  },
} as const

type StageTimelineProps = {
  stages: Stage[]
  selectedId: number
  onSelect: (id: number) => void
  onStageClick?: (stage: Stage) => void
  onOpenLearning: () => void
}

export function StageTimeline({
  stages,
  selectedId,
  onSelect,
  onStageClick,
  onOpenLearning,
}: StageTimelineProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="relative">
        {stages.map((stage, idx) => {
          const cfg = statusConfig[stage.status]
          const Icon = cfg.icon
          const isSelected = stage.id === selectedId

          return (
            <div
              key={stage.id}
              className="relative flex gap-3 sm:gap-4"
              onClick={() => {
                if (stage.status === "locked") return
                onSelect(stage.id)
                onStageClick?.(stage)
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    cfg.nodeStyle,
                    isSelected &&
                      stage.status !== "locked" &&
                      "ring-2 ring-brand/30 ring-offset-2 ring-offset-background",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      stage.status === "done" || stage.status === "current"
                        ? "bg-brand/40"
                        : "bg-border/40",
                    )}
                    style={{ minHeight: "28px" }}
                  />
                )}
              </div>

              <div
                className={cn(
                  "mb-4 flex-1 rounded-[28px] border p-4 transition-all",
                  cfg.cardStyle,
                  isSelected && stage.status !== "locked" ? "ring-1 ring-brand/40" : "",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{stage.title}</h3>
                      <span className={cn("text-xs font-medium", cfg.labelStyle)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {stage.desc}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-gold/20 bg-gold-dim px-2.5 py-1 text-xs font-semibold text-gold">
                    <Star className="h-3 w-3" />
                    +{stage.xp} XP
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/50 bg-background/55 px-2.5 py-1">
                    预计 {stage.estimatedTime}
                  </span>
                  {stage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/50 bg-surface-3 px-2.5 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {(stage.status === "current" || stage.status === "available") && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenLearning()
                    }}
                    className={cn(
                      "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors",
                      stage.status === "current"
                        ? "bg-brand text-brand-foreground hover:bg-brand/90"
                        : "border border-chart-3/25 bg-chart-3/10 text-chart-3 hover:bg-chart-3/15",
                    )}
                  >
                    {stage.status === "current" ? <Play className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    {stage.status === "current" ? "回到当前关卡继续学习" : "开始这一关"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
