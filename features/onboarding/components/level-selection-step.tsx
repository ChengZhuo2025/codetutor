import { ArrowLeft, ArrowRight, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_SECTION_CLASS,
  USER_PANEL_SUBTLE_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import type { Level, OnboardingLevel, OnboardingTool, ToolColor } from "@/features/onboarding/types"
import { cn } from "@/lib/utils"

type LevelSelectionStepProps = {
  selectedTool: OnboardingTool | null
  levels: OnboardingLevel[]
  level: Level | null
  colorMap: Record<ToolColor, string>
  isPending: boolean
  onSelectLevel: (level: Level) => void
  onBack: () => void
  onNext: () => void
}

export function LevelSelectionStep({
  selectedTool,
  levels,
  level,
  colorMap,
  isPending,
  onSelectLevel,
  onBack,
  onNext,
}: LevelSelectionStepProps) {
  const canGoNext = level !== null

  return (
    <div className="h-full w-1/3 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-between px-6 py-4 mt-6">
        <div className="mx-auto mb-4 max-w-2xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold-dim px-3 py-1 text-sm font-medium text-gold">
            <Target className="h-3.5 w-3.5" />
            第 2 步，共 3 步
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            你的编程基础更接近哪一种？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            没有标准答案，按真实情况选即可。我们会据此安排练习节奏，并推荐更贴你的路线。
          </p>
        </div>

        <div
          className={cn(
            USER_PANEL_SECTION_CLASS,
            "mx-auto mt-4 mb-4 flex w-full max-w-3xl items-center gap-4 rounded-2xl px-4 py-3",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              已选主工具
            </p>
            {selectedTool ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-md font-bold",
                    colorMap[selectedTool.color],
                  )}
                >
                  {selectedTool.name}
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">请返回上一步，先选好主工具。</p>
            )}
          </div>

          <div className={cn(USER_PANEL_SUBTLE_SECTION_CLASS, "hidden rounded-xl px-4 py-2 sm:block")}>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              再下一步
            </p>
            <p className="text-sm leading-5 text-foreground">
              选平台路线或自带教程自学
            </p>
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center">
          <div className="grid w-full gap-3">
            {levels.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectLevel(item.id)}
                aria-pressed={level === item.id}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-[20px] border p-4 text-left transition-all duration-300",
                  level === item.id
                    ? "border-brand/45 bg-brand/10 shadow-[0_22px_56px_-30px_rgba(15,23,42,0.26)] ring-1 ring-brand/10 dark:bg-brand/18"
                    : "border-border/70 bg-surface-2 shadow-[0_10px_26px_-26px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 hover:border-border hover:bg-surface-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    level === item.id
                      ? "border-brand bg-brand"
                      : "border-border/70 bg-surface-1 group-hover:border-brand/40 dark:border-white/10 dark:bg-white/5",
                  )}
                >
                  {level === item.id && (
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold">{item.label}</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-5 flex w-full max-w-3xl flex-col items-center gap-2 rounded-2xl px-4 py-3">
          <Button
            onClick={onNext}
            disabled={!canGoNext || !selectedTool || isPending}
            className={cn(
              "h-11 w-full max-w-xs text-md font-semibold",
              USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            {isPending ? "切换中…" : "下一步：选择学习方式"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={onBack}
            className="h-auto gap-1.5 p-0 text-sm font-normal text-muted-foreground underline-offset-4 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            返回上一步，改选工具
          </Button>
        </div>
      </div>
    </div>
  )
}
