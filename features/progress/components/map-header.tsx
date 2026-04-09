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
    <div className="shrink-0 border-b border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,251,0.82))] px-4 py-5 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:bg-[linear-gradient(180deg,oklch(0.19_0.012_250/0.92),oklch(0.16_0.01_250/0.82))] sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{pathName}</h1>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {pathSummary}
      </p>
    </div>
  )
}
