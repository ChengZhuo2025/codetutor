import { cn } from "@/lib/utils"
import type { ProgressTool } from "@/features/progress/types"

type MapHeaderProps = {
  done: number
  total: number
  activeTool: string
  tools: ProgressTool[]
  onToolChange: (toolId: string) => void
}

export function MapHeader({
  done,
  total,
  activeTool,
  tools,
  onToolChange,
}: MapHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 bg-surface-1/80 px-6 py-4 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-bold tracking-tight">闯关地图</h1>
        <p className="text-sm text-muted-foreground">
          已完成 {done}/{total} 关 · 累计 120 XP
        </p>
      </div>
      <div className="flex rounded-xl border border-border/60 bg-surface-2 p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTool === tool.id
                ? "bg-surface-4 text-foreground shadow-sm"
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
