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
    <div className="w-1/2 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-4 py-1.5 text-sm font-medium text-brand">
            <Sparkles className="h-4 w-4" />
            第 1 步，共 2 步
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            你想先学哪个 AI 编程工具？
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            可以选择多个，我们会基于你的选择生成不同的学习切入口，并把第一步收敛到今晚就能完成的任务。
          </p>
        </div>

        <div className="mx-auto mb-8 grid w-full max-w-4xl gap-4 rounded-[32px] border border-border/60 bg-surface-2/75 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              已选工具
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {selectedTools.length.toString().padStart(2, "0")}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              生成结果
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              根据工具类型推荐起步任务、路径节奏和后续学习素材。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTools.length > 0 ? (
                tools
                  .filter((tool) => selectedTools.includes(tool.id))
                  .map((tool) => (
                    <span
                      key={tool.id}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        colorMap[tool.color],
                      )}
                    >
                      {tool.name}
                    </span>
                  ))
              ) : (
                <span className="rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground">
                  选择工具后这里会展示你的路径入口
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto mb-8 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id)

            return (
              <button
                key={tool.id}
                onClick={() => onToggleTool(tool.id)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-300",
                  isSelected
                    ? `${selectedBorderMap[tool.color]} bg-surface-1 shadow-[0_20px_50px_-28px_oklch(0.78_0.15_180/0.5)]`
                    : "border-border/60 bg-surface-2 hover:-translate-y-1 hover:border-border hover:bg-surface-1",
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold",
                      colorMap[tool.color],
                    )}
                  >
                    {tool.name[0]}
                  </div>

                  <div className="flex items-center gap-2">
                    {tool.popular && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          isSelected
                            ? "border border-brand/30 bg-brand-dim text-brand"
                            : "bg-background text-muted-foreground",
                        )}
                      >
                        推荐起步
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border transition-all",
                        isSelected
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border/60 bg-background text-transparent group-hover:text-muted-foreground",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg font-semibold">{tool.name}</span>
                    <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{tool.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 rounded-[32px] border border-border/60 bg-surface-2/70 px-5 py-5">
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
              "h-14 w-full max-w-md rounded-2xl text-base font-semibold shadow-[0_24px_64px_-26px_oklch(0.78_0.15_180/0.78)] transition-all",
              canGoNext
                ? "bg-brand text-brand-foreground hover:-translate-y-0.5 hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            下一步：确认我的当前水平
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            之后可以随时添加或更改工具，不会锁死你的学习路线。
          </p>
        </div>
      </div>
    </div>
  )
}
