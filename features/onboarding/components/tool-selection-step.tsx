import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_SECTION_CLASS,
  USER_PANEL_SUBTLE_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import type { OnboardingToolGroup } from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

type ToolSelectionStepProps = {
  toolGroups: OnboardingToolGroup[]
  colorMap: Record<string, string>
  selectedBorderMap: Record<string, string>
  selectedToolCode: string | null
  onSelectTool: (toolCode: string) => void
  onNext: () => void
}

export function ToolSelectionStep({
  toolGroups,
  colorMap,
  selectedBorderMap,
  selectedToolCode,
  onSelectTool,
  onNext,
}: ToolSelectionStepProps) {
  const canGoNext = selectedToolCode !== null
  const selectedTool = toolGroups
    .flatMap((group) => group.tools)
    .find((tool) => tool.code === selectedToolCode)

  return (
    <div className="h-full w-1/3 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-between px-6 py-4 mt-6">
        <div className="mx-auto mb-4 max-w-2xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-sm font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            第 1 步，共 3 步
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            你打算主要用哪个工具来练？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            点选一项作为「主工具」。后面我们会根据你的基础，推荐更合适的练习强度和学习路线。
          </p>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 mt-4">
          <div className="grid w-full gap-3 xl:grid-cols-3">
            {toolGroups.map((group) => (
              <section
                key={group.groupCode}
                className={cn(
                  USER_PANEL_SECTION_CLASS,
                  "flex min-h-0 flex-col rounded-[24px] p-4 bg-surface-2",
                )}
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.groupName}
                  </p>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {group.tools.map((tool) => {
                    const isSelected = selectedToolCode === tool.code

                    return (
                      <button
                        key={tool.code}
                        onClick={() => onSelectTool(tool.code)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group relative overflow-hidden rounded-[20px] border px-3 py-3 text-left transition-all duration-300",
                          isSelected
                            ? `${selectedBorderMap[tool.color]} bg-surface-1 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04] dark:ring-white/8`
                            : "border-border/70 bg-surface-1/95 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:border-border hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                        )}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-bold",
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
                                    ? "border border-brand/35 bg-brand/12 text-brand"
                                    : "border border-border/70 bg-muted/65 text-muted-foreground dark:border-white/10 dark:bg-white/6",
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
                                  : "border-border/70 bg-surface-1 text-transparent group-hover:text-muted-foreground dark:border-white/10 dark:bg-white/5",
                              )}
                            >
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="truncate text-md font-bold">{tool.name}</span>
                            <span className="rounded-full border border-border/70 bg-muted/55 px-2 py-0.5 text-[11px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              {tool.category}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm leading-4.5 text-muted-foreground">
                            {tool.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-5 flex w-full max-w-3xl flex-col items-center gap-2 rounded-2xl px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {selectedTool ? (
              <>
                已选 <span className="font-semibold text-brand">{selectedTool.name}</span>
                。下一步请如实选择你的基础，方便我们匹配难度。
              </>
            ) : (
              "请先点选上面一项主工具，再点按钮继续。"
            )}
          </p>
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "h-11 w-full max-w-xs text-md font-semibold",
              USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            下一步：选择我的基础
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
