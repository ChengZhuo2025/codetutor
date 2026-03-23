import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  colorMap,
  levels,
  tools,
} from "@/features/onboarding/data/onboarding-data"
import type { Level } from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

type LevelSelectionStepProps = {
  selectedTools: string[]
  level: Level | null
  onSelectLevel: (level: Level) => void
  onBack: () => void
  onFinish: () => void
}

export function LevelSelectionStep({
  selectedTools,
  level,
  onSelectLevel,
  onBack,
  onFinish,
}: LevelSelectionStepProps) {
  const canFinish = level !== null

  return (
    <div className="w-1/2 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">第 2 步，共 2 步</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">你目前的编程水平是？</h1>
          <p className="text-muted-foreground">我们会根据你的水平调整学习节奏和内容深度</p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {selectedTools.map((id) => {
            const tool = tools.find((item) => item.id === id)
            if (!tool) return null

            return (
              <span
                key={id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  colorMap[tool.color],
                )}
              >
                {tool.name}
              </span>
            )
          })}
        </div>

        <div className="mb-10 space-y-3">
          {levels.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectLevel(item.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all",
                level === item.id
                  ? "border-brand bg-brand-dim"
                  : "border-border/60 bg-surface-2 hover:border-border",
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  level === item.id ? "border-brand bg-brand" : "border-border/60",
                )}
              >
                {level === item.id && (
                  <div className="h-2 w-2 rounded-full bg-brand-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pb-10">
          <Button
            onClick={onFinish}
            disabled={!canFinish}
            className={cn(
              "h-12 w-full max-w-sm text-base font-semibold",
              canFinish
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            生成我的学习路径
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回修改工具选择
          </button>
        </div>
      </div>
    </div>
  )
}
