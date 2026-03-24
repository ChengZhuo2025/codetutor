import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getOnboardingPageMock } from "@/lib/api/mock"
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
  const { colorMap, selectedBorderMap, tools } = getOnboardingPageMock()
  const canGoNext = selectedTools.length > 0

  return (
    <div className="w-1/2 overflow-y-auto scrollbar-none">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-6 py-6 mt-6">
        {/* 标题区域 - 更紧凑 */}
        <div className="mx-auto mb-5 max-w-2xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-sm font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            第 1 步，共 2 步
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            你想先学哪个 AI 编程工具？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            可以选择多个，我们会基于你的选择生成不同的学习切入口。
          </p>
        </div>

        {/* 工具选择卡片 - 三列布局 */}
        <div className="mx-auto mb-5 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id)

            return (
              <button
                key={tool.id}
                onClick={() => onToggleTool(tool.id)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300",
                  isSelected
                    ? `${selectedBorderMap[tool.color]} bg-surface-1 shadow-[0_20px_50px_-28px_oklch(0.78_0.15_180/0.5)]`
                    : "border-border/60 bg-surface-2 hover:-translate-y-0.5 hover:border-border hover:bg-surface-1",
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="mb-2 flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-bold",
                      colorMap[tool.color],
                    )}
                  >
                    {tool.name[0]}
                  </div>

                  <div className="flex items-center gap-2">
                    {tool.popular && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          isSelected
                            ? "border border-brand bg-brand-dim text-brand"
                            : "bg-background text-muted-foreground",
                        )}
                      >
                        推荐
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                        isSelected
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border/80 bg-background text-transparent group-hover:text-muted-foreground",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="truncate text-md font-bold">{tool.name}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-4 text-muted-foreground">{tool.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* 已选提示和操作区 - 更紧凑 */}
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            {selectedTools.length > 0 ? (
              <>
                已选择 <span className="font-semibold text-brand">{selectedTools.length}</span>{" "}
                个工具，下一步将根据你的基础生成最合适的起步路径。
              </>
            ) : (
              "先选择至少一个工具，我们再帮你继续收窄学习路径。"
            )}
          </p>
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "h-11 w-full max-w-xs rounded-xl text-md font-semibold shadow-[0_24px_64px_-26px_oklch(0.78_0.15_180/0.78)] transition-all",
              canGoNext
                ? "bg-brand text-brand-foreground hover:-translate-y-0.5 hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            下一步：确认我的当前水平
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
