import { Flame, Sparkles, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MapSummary, ProgressTool, Stage } from "@/features/progress/types"

type MapHeaderProps = {
  done: number
  total: number
  activeTool: string
  tools: ProgressTool[]
  summary: MapSummary
  currentStage: Stage
  onToolChange: (toolId: string) => void
}

export function MapHeader({
  done,
  total,
  activeTool,
  tools,
  summary,
  currentStage,
  onToolChange,
}: MapHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/50 bg-surface-1/80 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            成长路径总览
          </div>
          <h1 className="text-2xl font-bold tracking-tight">闯关地图</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            已完成 {done}/{total} 关，当前主线是
            <span className="font-medium text-foreground"> {currentStage.title}</span>。
            继续当前关卡会比切换新主题更容易维持连续成长。
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              <Zap className="h-3.5 w-3.5 text-brand" />
              累计 XP
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{summary.totalXP} XP</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              <Flame className="h-3.5 w-3.5 text-gold" />
              连续学习
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{summary.streakDays} 天</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              下一段位
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{summary.nextRank}</p>
            <p className="text-xs text-muted-foreground">
              还差 {summary.remainingXPToNextRank} XP
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap rounded-2xl border border-border/60 bg-surface-2 p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4",
              activeTool === tool.id
                ? "bg-background text-foreground shadow-[0_12px_24px_-20px_oklch(0.96_0.01_240/0.9)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  )
}
