import { Sparkles } from "lucide-react"
import type { Stage } from "@/features/progress/types"

type MapHeaderProps = {
  pathName: string
  pathSummary: string
  done: number
  total: number
  currentStage: Stage
}

export function MapHeader({
  pathName,
  pathSummary
}: MapHeaderProps) {
  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-surface-1/85 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-4">
      <div className="min-w-0 max-w-4xl">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          当前学习计划
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {pathName}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {pathSummary}
        </p>
      </div>
    </div>
  )
}
