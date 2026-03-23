import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { colorMap, selectedBorderMap, tools } from "@/features/onboarding/data/onboarding-data"
import { cn } from "@/lib/utils"

type ToolSelectionStepProps = {
  selectedTools: string[]
  onToggleTool: (id: string) => void
  onNext: () => void
}

export function ToolSelectionStep({
  selectedTools,
  onToggleTool,
  onNext,
}: ToolSelectionStepProps) {
  const canGoNext = selectedTools.length > 0

  return (
    <div className="w-1/2 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-muted-foreground">第 1 步，共 2 步</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">你想学哪个 AI 编程工具？</h1>
          <p className="text-muted-foreground">可以选择多个，我们会为每个工具生成专属学习路径</p>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id)

            return (
              <button
                key={tool.id}
                onClick={() => onToggleTool(tool.id)}
                className={cn(
                  "relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all",
                  isSelected
                    ? `${selectedBorderMap[tool.color]} bg-surface-2 shadow-[0_0_20px_oklch(0.78_0.15_180/0.08)]`
                    : "border-border/60 bg-surface-2 hover:border-border",
                )}
              >
                {tool.popular && !isSelected && (
                  <span className="absolute right-4 top-4 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    推荐
                  </span>
                )}
                {isSelected && (
                  <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                    <Check className="h-3 w-3 text-brand-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                    colorMap[tool.color],
                  )}
                >
                  {tool.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="font-semibold">{tool.name}</span>
                    <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tool.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3 pb-10">
          {selectedTools.length > 0 && (
            <p className="text-sm text-muted-foreground">
              已选择 <span className="font-semibold text-brand">{selectedTools.length}</span> 个工具
            </p>
          )}
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "h-12 w-full max-w-sm text-base font-semibold",
              canGoNext
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            下一步：设置水平
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">之后可以随时添加或更改工具</p>
        </div>
      </div>
    </div>
  )
}
