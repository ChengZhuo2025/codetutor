import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import type { OnboardingToolGroup } from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

type ToolSelectionStepProps = {
  toolGroups: OnboardingToolGroup[]
  colorMap: Record<string, string>
  selectedBorderMap: Record<string, string>
  selectedToolCode: string | null
  isActive: boolean
  onSelectTool: (toolCode: string) => void
  onNext: () => void
}

export function ToolSelectionStep({
  toolGroups,
  colorMap,
  selectedBorderMap,
  selectedToolCode,
  isActive,
  onSelectTool,
  onNext,
}: ToolSelectionStepProps) {
  const canGoNext = selectedToolCode !== null
  const selectedTool = toolGroups
    .flatMap((group) => group.tools)
    .find((tool) => tool.code === selectedToolCode)

  return (
    <div
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
      className={cn("w-full md:h-full md:w-1/3 md:overflow-hidden", !isActive && "hidden md:block")}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-6xl flex-col px-4 pb-24 pt-5 sm:px-6 md:h-full md:min-h-0 md:justify-between md:px-6 md:py-4 md:pb-4 md:pt-10">
        <div className="mx-auto mb-4 max-w-2xl text-center md:mb-4">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            第 1 步，共 3 步
          </div>
          <h1 className="text-[1.72rem] font-bold leading-tight tracking-tight text-balance sm:text-3xl md:text-3xl">
            你打算主要用哪个工具来练？
          </h1>
          <p className="mx-auto mt-2 max-w-[21rem] text-sm leading-6 text-muted-foreground sm:max-w-none">
            点选一项作为「主工具」。后面我们会根据你的基础，推荐更合适的练习强度和学习路线。
          </p>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 md:mt-4">
          <div className="grid w-full gap-3 md:gap-3 xl:grid-cols-3">
            {toolGroups.map((group) => (
              <section
                key={group.groupCode}
                className={cn(
                  USER_PANEL_SECTION_CLASS,
                  "flex min-h-0 flex-col rounded-[22px] bg-surface-2 p-3 sm:p-4 md:rounded-[24px]",
                )}
              >
                <div className="mb-2.5 md:mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
                    {group.groupName}
                  </p>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-1">
                  {group.tools.map((tool) => {
                    const isSelected = selectedToolCode === tool.code

                    return (
                      <button
                        key={tool.code}
                        onClick={() => onSelectTool(tool.code)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group relative overflow-hidden rounded-[18px] border px-3 py-2.5 text-left transition-all duration-300 md:rounded-[20px] md:py-3",
                          isSelected
                            ? `${selectedBorderMap[tool.color]} bg-surface-1 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04] dark:ring-white/8`
                            : "border-border/70 bg-surface-1/95 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:border-border hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                        )}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                              colorMap[tool.color],
                            )}
                          >
                            {tool.name[0]}
                          </div>

                          <div className="flex items-center gap-2">
                            {tool.popular && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold md:text-xs",
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
                            <span className="truncate text-base font-bold md:text-md">{tool.name}</span>
                            <span className="rounded-full border border-border/70 bg-muted/55 px-2 py-0.5 text-[11px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              {tool.category}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-sm leading-5 text-muted-foreground md:line-clamp-2 md:leading-4.5">
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
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full flex-col items-center gap-2 border-t border-border/70 bg-background/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_42px_-34px_rgba(15,23,42,0.5)] backdrop-blur md:static md:mt-5 md:max-w-3xl md:border-0 md:bg-transparent md:px-4 md:py-3 md:shadow-none md:backdrop-blur-0">
          <p className="text-center text-xs leading-5 text-muted-foreground md:text-sm">
            {selectedTool ? (
              <>
                已选学习工具: <span className="font-semibold text-brand">{selectedTool.name}</span>
              </>
            ) : (
              "请先点选上面一项主工具，再点按钮继续。"
            )}
          </p>
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "h-11 w-full max-w-sm text-md font-semibold md:max-w-xs",
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
