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
import type {
  OnboardingPresetPathOption,
  OnboardingSelectionMode,
  OnboardingSelfStudyOption,
  OnboardingTool,
  ToolColor,
} from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

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

        <div className="mx-auto mb-3 flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-surface-2/75 px-4 py-2 mt-4">
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
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-sm text-foreground">
            {levelLabel}
          </span>
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-sm text-muted-foreground">
            在下面选一种即可
          </span>
        </div>

        <div className="mx-auto h-[min(46vh,28rem)] w-full max-w-3xl overflow-hidden">
          <div className="flex h-full flex-col gap-3 overflow-y-auto scrollbar-none">
            <button
              onClick={onSelectSelfStudy}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-all duration-300",
                selectionMode === "self_directed"
                  ? "border-brand bg-brand-dim/55 shadow-[0_22px_60px_-34px_oklch(0.78_0.15_180/0.8)]"
                  : "border-border/60 bg-surface-2/70 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface-1",
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
                  <div className="rounded-full border border-border/60 bg-background/80 p-2 text-brand">
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

            <section className="rounded-2xl border border-border/60 bg-surface-2/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-chart-3/30 bg-chart-3/10 px-2.5 py-1 text-xs font-semibold text-chart-3">
                    平台路线
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">推荐学习路线</h2>
                </div>
                <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
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
                        "rounded-2xl border p-3 text-left transition-all duration-300",
                        isSelected
                          ? "border-brand bg-brand-dim/50 shadow-[0_24px_60px_-36px_oklch(0.78_0.15_180/0.8)]"
                          : "border-border/60 bg-background/70 hover:border-border hover:bg-surface-1",
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
                              <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-foreground">
                                <Bot className="mr-1 inline h-3.5 w-3.5" />
                                {path.coachAgentLabel}
                              </span>
                              {path.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground"
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
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                        <div className="mt-3 rounded-xl border border-border/60 bg-surface-2/70 px-4 py-3">
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

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 pt-3 pb-2 mt-3">
          <Button
            onClick={onFinish}
            disabled={!canFinish || isPending}
            className={cn(
              "h-11 w-full max-w-xs rounded-xl text-md font-semibold shadow-[0_24px_64px_-26px_oklch(0.78_0.15_180/0.78)] transition-all",
              canFinish
                ? "bg-brand text-brand-foreground hover:-translate-y-0.5 hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            {buildCtaLabel(selectionMode, isPending)}
          </Button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            返回上一步，改基础水平
          </button>
        </div>
      </div>
    </div>
  )
}
