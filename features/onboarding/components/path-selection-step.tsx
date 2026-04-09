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
  "rounded-full border border-border/70 bg-surface-1/95 px-3 py-1 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

type PathSelectionStepProps = {
  selectedTool: OnboardingTool | null
  levelLabel: string
  selfStudyOption: OnboardingSelfStudyOption
  presetPathOptions: OnboardingPresetPathOption[]
  colorMap: Record<ToolColor, string>
  selectionMode: OnboardingSelectionMode | null
  selectedPathId: string | null
  isPending: boolean
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
    <div className="h-full w-1/3 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 py-4 mt-4">
        <div className="mx-auto mb-4 max-w-3xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-sm font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            第 3 步，共 3 步
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            打算怎么开始学？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            你可以跟平台推荐的学习路线一步步练，也可以贴自己的教程、链接，让AI教练陪你自学自练。
          </p>
        </div>

        <div
          className={cn(
            USER_PANEL_SECTION_CLASS,
            "mx-auto mt-4 mb-3 flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl px-4 py-3",
          )}
        >
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
          <span className={cn(onboardingMetaPillClass, "text-muted-foreground")}>
            在下面选一种即可
          </span>
        </div>

        <div className="mx-auto h-[min(46vh,28rem)] w-full max-w-3xl overflow-hidden">
          <div className="flex h-full flex-col gap-3 overflow-y-auto scrollbar-none">
            <button
              onClick={onSelectSelfStudy}
              className={cn(
                "w-full rounded-[24px] border p-4 text-left transition-all duration-300",
                selectionMode === "self_directed"
                  ? "border-brand/45 bg-brand/12 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)] ring-1 ring-brand/10 dark:bg-brand/18"
                  : "border-border/70 bg-surface-1/95 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              )}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-brand/30 bg-brand-dim px-2.5 py-1 text-xs font-semibold text-brand">
                    自带材料
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">{selfStudyOption.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-brand/20 bg-brand/12 p-2 text-brand dark:border-brand/30 dark:bg-brand/18">
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

              <p className="mb-1 text-sm leading-4 text-foreground">{selfStudyOption.summary}</p>
            </button>

            <section className={cn(USER_PANEL_SECTION_CLASS, "rounded-[24px] p-4")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-chart-3/30 bg-chart-3/10 px-2.5 py-1 text-xs font-semibold text-chart-3">
                    平台路线
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">推荐学习路线</h2>
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
                        "rounded-[22px] border p-3 text-left transition-all duration-300",
                        isSelected
                          ? "border-brand/45 bg-brand/12 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)] ring-1 ring-brand/10 dark:bg-brand/18"
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
                        <div className="flex items-start justify-between gap-4">
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
                              {path.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {path.recommended ? (
                              <span className="rounded-full border border-brand/40 bg-brand-dim px-2 py-0.5 text-[11px] font-semibold text-brand">
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

        <div
          className={cn(
            USER_PANEL_SUBTLE_SECTION_CLASS,
            "mx-auto mt-3 flex w-full max-w-3xl flex-col items-center gap-2 rounded-2xl px-4 pt-3 pb-2",
          )}
        >
          <Button
            onClick={onFinish}
            disabled={!canFinish || isPending}
            className={cn(
              "h-11 w-full max-w-xs text-md font-semibold",
              USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            {buildCtaLabel(selectionMode, isPending)}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-1 text-sm"
          >
            <ArrowLeft className="h-3 w-3" />
            返回上一步，改基础水平
          </Button>
        </div>
      </div>
    </div>
  )
}
