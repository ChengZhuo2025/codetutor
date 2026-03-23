import {
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
    cardStyle: "border-brand/20 bg-brand-dim/30",
    label: "已完成",
    labelStyle: "text-brand",
  },
  current: {
    icon: Play,
    nodeStyle:
      "border-brand bg-brand-dim text-brand shadow-[0_0_20px_oklch(0.78_0.15_180/0.4)] animate-pulse",
    cardStyle:
      "border-brand/50 bg-brand-dim shadow-[0_0_30px_oklch(0.78_0.15_180/0.08)] cursor-pointer",
    label: "进行中",
    labelStyle: "text-brand",
  },
  available: {
    icon: ChevronRight,
    nodeStyle: "border-border/60 bg-surface-3 text-muted-foreground",
    cardStyle: "border-border/60 bg-surface-2 hover:border-border cursor-pointer",
    label: "可解锁",
    labelStyle: "text-muted-foreground",
  },
  locked: {
    icon: Lock,
    nodeStyle: "border-border/40 bg-surface-3 text-muted-foreground/40",
    cardStyle: "border-border/30 bg-surface-2/50 opacity-50",
    label: "待解锁",
    labelStyle: "text-muted-foreground/50",
  },
} as const

type StageTimelineProps = {
  stages: Stage[]
  selectedId: number
  onSelect: (id: number) => void
  onOpenLearning: () => void
}

export function StageTimeline({
  stages,
  selectedId,
  onSelect,
  onOpenLearning,
}: StageTimelineProps) {
  return (
    <div className="flex w-[52%] shrink-0 flex-col overflow-y-auto border-r border-border/40 px-6 py-6">
      <div className="relative">
        {stages.map((stage, idx) => {
          const cfg = statusConfig[stage.status]
          const Icon = cfg.icon
          const isSelected = stage.id === selectedId

          return (
            <div
              key={stage.id}
              className="relative flex gap-4"
              onClick={() => stage.status !== "locked" && onSelect(stage.id)}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
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
                      stage.status === "done" ? "bg-brand/40" : "bg-border/40",
                    )}
                    style={{ minHeight: "24px" }}
                  />
                )}
              </div>

              <div
                className={cn(
                  "mb-3 flex-1 rounded-2xl border p-4 transition-all",
                  cfg.cardStyle,
                  isSelected && stage.status !== "locked" ? "ring-1 ring-brand/40" : "",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{stage.title}</h3>
                      <span className={cn("text-xs font-medium", cfg.labelStyle)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {stage.desc}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gold">
                    <Star className="h-3 w-3" />
                    +{stage.xp}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {stage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/50 bg-surface-3 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {stage.status === "current" && (
                  <button
                    onClick={onOpenLearning}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                  >
                    <Play className="h-3.5 w-3.5" />
                    继续学习
                  </button>
                )}
                {stage.status === "available" && (
                  <button
                    onClick={onOpenLearning}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    开始这一关
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
