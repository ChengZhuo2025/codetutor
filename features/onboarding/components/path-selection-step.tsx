import { useState } from "react"
import {
  ArrowLeft,
  BookOpenText,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
  USER_PANEL_SECTION_CLASS,
  USER_PANEL_SUBTLE_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import type {
  OnboardingPresetPathOption,
  OnboardingSelectionMode,
  OnboardingSelfStudyOption,
  OnboardingTool,
  ToolColor,
} from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

const onboardingMetaPillClass =
  "rounded-full border border-border bg-surface-2 px-3 py-1 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

type PathSelectionStepProps = {
  selectedTool: OnboardingTool | null
  levelLabel: string
  selfStudyOption: OnboardingSelfStudyOption
  presetPathOptions: OnboardingPresetPathOption[]
  colorMap: Record<ToolColor, string>
  selectionMode: OnboardingSelectionMode | null
  selectedPathId: string | null
  isPending: boolean
  isActive: boolean
  onSelectSelfStudy: () => void
  onSelectPresetPath: (pathId: string) => void
  onBack: () => void
  onFinish: () => void
}

function buildCtaLabel(mode: OnboardingSelectionMode | null, isPending: boolean) {
  if (isPending) {
    return "正在进入…"
  }

  if (mode === "self_directed") {
    return "进入自主学习"
  }

  if (mode === "preset_training") {
    return "从这条路开始"
  }

  return "请先选择一种方式"
}

export function PathSelectionStep({
  selectedTool,
  levelLabel,
  selfStudyOption,
  presetPathOptions,
  colorMap,
  selectionMode,
  selectedPathId,
  isPending,
  isActive,
  onSelectSelfStudy,
  onSelectPresetPath,
  onBack,
  onFinish,
}: PathSelectionStepProps) {
  const canFinish = selectionMode !== null
  const [expandedPathIds, setExpandedPathIds] = useState<string[]>([])

  const toggleExpanded = (pathId: string) => {
    setExpandedPathIds((current) =>
      current.includes(pathId) ? current.filter((item) => item !== pathId) : [...current, pathId],
    )
  }

  return (
    <div
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
      className={cn("w-full md:h-full md:w-1/3 md:overflow-hidden", !isActive && "hidden md:block")}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-5xl flex-col px-4 pb-24 pt-5 sm:px-6 md:h-full md:min-h-0 md:px-6 md:py-4 md:pb-4 md:pt-8">
        <div className="mx-auto mb-4 max-w-3xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            第 3 步，共 3 步
          </div>
          <h1 className="text-[1.72rem] font-bold leading-tight tracking-tight text-balance sm:text-3xl md:text-3xl">
            打算怎么开始学？
          </h1>
          <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-6 text-muted-foreground sm:max-w-none">
            你可以跟平台推荐的学习路线一步步练，也可以贴自己的教程、链接，让AI教练陪你自学自练。
          </p>
        </div>

        <div className="mx-auto mb-4 flex w-full max-w-3xl flex-wrap items-center gap-2 md:mt-4">
          <span className="text-sm font-medium text-muted-foreground">
            已选主工具：
          </span>
          {selectedTool ? (
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                colorMap[selectedTool.color],
              )}
            >
              {selectedTool.name}
            </span>
          ) : null}
          <span className={cn(onboardingMetaPillClass, "text-foreground")}>
            {levelLabel}
          </span>
          <span className={cn(onboardingMetaPillClass, "hidden text-muted-foreground sm:inline-flex")}>
            在下面选一种即可
          </span>
        </div>

        <div className="mx-auto w-full max-w-3xl md:h-[min(46vh,28rem)] md:overflow-hidden">
          <div className="flex flex-col gap-3 md:h-full md:overflow-y-auto md:scrollbar-none">
            <button
              onClick={onSelectSelfStudy}
              className={cn(
                "w-full rounded-[22px] border p-4 text-left transition-all duration-300 md:rounded-[24px]",
                selectionMode === "self_directed"
                  ? "border-brand/45 bg-brand/10 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)] ring-1 ring-brand/10 dark:bg-brand/18"
                  : "border-border/70 bg-surface-2 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand/30 bg-brand-dim px-2.5 py-1 text-xs font-semibold text-brand">
                    自带材料
                  </span>
                  <h2 className="text-lg font-semibold text-foreground md:text-xl">{selfStudyOption.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-brand">
                    <BookOpenText className="h-4 w-4" />
                  </div>
                  <CheckCircle2
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      selectionMode === "self_directed" ? "text-brand" : "text-muted-foreground/50",
                    )}
                  />
                </div>
              </div>

              <p className="text-sm leading-5 text-foreground md:mb-1 md:leading-4">{selfStudyOption.summary}</p>
            </button>

            <section className={cn(USER_PANEL_SECTION_CLASS, "rounded-[22px] bg-surface-2 p-4 dark:border-white/10 dark:bg-white/5 md:rounded-[24px]")}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-full border border-chart-3/30 bg-chart-3/10 px-2.5 py-1 text-xs font-semibold text-chart-3">
                    平台路线
                  </span>
                  <h2 className="text-lg font-semibold text-foreground md:text-xl">推荐学习路线</h2>
                </div>
                <span className="rounded-full border border-border/70 bg-muted/65 px-3 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  共 {presetPathOptions.length} 条
                </span>
              </div>

              <div className="grid gap-3">
                {presetPathOptions.map((path) => {
                  const isSelected =
                    selectionMode === "preset_training" && selectedPathId === path.pathId
                  const isExpanded = expandedPathIds.includes(path.pathId)

                  return (
                    <div
                      key={path.pathId}
                      className={cn(
                        "rounded-[20px] border p-3 text-left transition-all duration-300 md:rounded-[22px]",
                        isSelected
                          ? "border-brand/45 bg-brand/10 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)] ring-1 ring-brand/10 dark:bg-brand/18"
                          : "border-border/70 bg-surface-1/95 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.22)] hover:border-border hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectPresetPath(path.pathId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onSelectPresetPath(path.pathId)
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3 md:gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-foreground">{path.name}</h3>
                              <span className="rounded-full border border-brand/20 bg-brand-dim/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                                共 {path.stageCount} 关
                              </span>
                              <span className="rounded-full border border-gold/20 bg-gold-dim px-2.5 py-0.5 text-[11px] font-semibold text-gold">
                                +10 XP
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-5 text-muted-foreground">
                              {path.summary}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                <Bot className="mr-1 inline h-3.5 w-3.5" />
                                {path.coachAgentLabel}
                              </span>
                              {path.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {path.tags.length > 2 ? (
                                <span className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                  +{path.tags.length - 2}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {path.recommended ? (
                              <span className="hidden rounded-full border border-brand/40 bg-brand-dim px-2 py-0.5 text-[11px] font-semibold text-brand sm:inline-flex">
                                推荐
                              </span>
                            ) : null}
                            <CheckCircle2
                              className={cn(
                                "h-5 w-5 transition-colors",
                                isSelected ? "text-brand" : "text-muted-foreground/50",
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleExpanded(path.pathId)
                          }}
                          className={cn(
                            USER_PANEL_OUTLINE_BUTTON_CLASS,
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white",
                          )}
                        >
                          {isExpanded ? "收起预览" : "展开关卡"}
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div
                          className={cn(
                            USER_PANEL_SUBTLE_SECTION_CLASS,
                            "mt-3 rounded-xl px-4 py-3",
                          )}
                        >
                          <div className="space-y-0">
                            {path.preview.map((step, index) => (
                              <div key={step} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-brand/30 bg-brand-dim text-[11px] font-semibold text-brand">
                                    {index + 1}
                                  </span>
                                  {index < path.preview.length - 1 ? (
                                    <span className="mt-1 h-4 w-px bg-gradient-to-b from-brand/50 to-border/60" />
                                  ) : null}
                                </div>
                                <div className="pt-0.5">
                                  <p className="text-sm text-foreground">{step}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full flex-col items-center gap-2 border-t border-border/70 bg-background/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_42px_-34px_rgba(15,23,42,0.5)] backdrop-blur md:static md:mt-5 md:max-w-3xl md:border-0 md:bg-transparent md:px-4 md:py-3 md:shadow-none md:backdrop-blur-0">
          <Button
            onClick={onFinish}
            disabled={!canFinish || isPending}
            className={cn(
              "h-11 w-full max-w-sm text-md font-semibold md:max-w-xs",
              USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            {buildCtaLabel(selectionMode, isPending)}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={onBack}
            className="h-auto gap-1.5 p-0 text-sm font-normal text-muted-foreground underline-offset-4 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            返回上一步，改基础水平
          </Button>
        </div>
      </div>
    </div>
  )
}
