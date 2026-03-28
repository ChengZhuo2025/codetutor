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
    <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{pathName}</h1>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {pathSummary}
      </p>
    </div>
  )
}
