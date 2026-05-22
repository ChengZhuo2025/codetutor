"use client"

import {
  CheckCircle2,
  FileSearch,
  ListChecks,
  Loader2,
  Route,
} from "lucide-react"
import type { MaterialPlanAsyncStatus } from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"

type MaterialPlanGenerationLoaderProps = {
  status?: MaterialPlanAsyncStatus | null
  progressPercent: number
  progressMessage: string
}

type MaterialPlanGenerationStage = {
  id: "extracting" | "planning" | "quality_checking"
  label: string
  description: string
  Icon: typeof FileSearch
}

const GENERATION_STAGES: MaterialPlanGenerationStage[] = [
  {
    id: "extracting",
    label: "解析教程内容",
    description: "提取页面结构、关键概念和可练习材料。",
    Icon: FileSearch,
  },
  {
    id: "planning",
    label: "拆解学习路径",
    description: "把教程内容整理成循序渐进的任务。",
    Icon: Route,
  },
  {
    id: "quality_checking",
    label: "校验计划质量",
    description: "检查任务颗粒度、证据覆盖和新手可执行性。",
    Icon: ListChecks,
  },
]

function resolveCurrentStageIndex(status?: MaterialPlanAsyncStatus | null) {
  switch (status) {
    case "planning":
      return 1
    case "quality_checking":
    case "ready":
      return 2
    case "queued":
    case "extracting":
    default:
      return 0
  }
}

function MaterialPlanStageStatusItem({
  stage,
  index,
  currentIndex,
}: {
  stage: MaterialPlanGenerationStage
  index: number
  currentIndex: number
}) {
  const completed = index < currentIndex
  const active = index === currentIndex
  const Icon = stage.Icon

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border/50 py-3 transition-colors duration-300 last:border-b-0",
        completed
          ? "text-chart-3"
          : active
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
          completed
            ? "border-chart-3/30 bg-chart-3/12 text-chart-3"
            : active
              ? "border-brand/30 bg-brand/12 text-brand"
              : "border-border/70 bg-muted/45 text-muted-foreground",
        )}
      >
        {completed ? (
          <CheckCircle2 className="size-4" aria-hidden />
        ) : active ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-4" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            completed
              ? "text-chart-3"
              : active
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {stage.label}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.description}</p>
      </div>
    </div>
  )
}

function MaterialPlanOrbitVisualizer({ currentIndex }: { currentIndex: number }) {
  const activeStage = GENERATION_STAGES[currentIndex] ?? GENERATION_STAGES[0]
  const Icon = activeStage.Icon

  return (
    <div className="relative mx-auto flex size-40 items-center justify-center sm:size-48">
      <div className="absolute inset-7 rounded-full bg-brand/8 blur-2xl dark:bg-brand/12" />

      <div className="material-plan-visual-object relative flex h-30 w-34 flex-col overflow-hidden rounded-2xl bg-background/70 p-3 dark:bg-white/[0.04] sm:h-34 sm:w-38">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/40 pb-2 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-chart-4" />
            <span className="size-1.5 rounded-full bg-chart-2" />
            <span className="size-1.5 rounded-full bg-chart-3" />
          </div>
          <div className="h-1.5 w-14 rounded-full bg-brand/20" />
        </div>

        <div className="flex flex-1 gap-3">
          <div className="flex-1 space-y-2 pt-1">
            {[74, 92, 58, 82].map((width, index) => (
              <div
                key={width}
                className="material-plan-skeleton-line h-1.5 rounded-full bg-muted"
                style={{
                  width: `${width}%`,
                  animationDelay: `${index * 140}ms`,
                }}
              />
            ))}
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand/18 bg-brand/10 text-brand sm:size-14">
            <Icon className="size-6" aria-hidden />
          </div>
        </div>

        <div className="material-plan-scan-beam absolute inset-0 pointer-events-none" />
      </div>
    </div>
  )
}

export function MaterialPlanGenerationLoader({
  status,
  progressPercent,
  progressMessage,
}: MaterialPlanGenerationLoaderProps) {
  // Adapted from OpenMAIC's lesson-generation loading interaction:
  // centered visualizer, stage dots, milestone rows, and live status copy.
  const currentIndex = resolveCurrentStageIndex(status)
  const progress = Math.max(0, Math.min(100, progressPercent))

  return (
    <div className="sticky top-4 w-full max-w-xl rounded-[24px] p-4 backdrop-blur-sm sm:top-6 sm:p-5">
      <div className="flex justify-center gap-2" aria-hidden>
        {GENERATION_STAGES.map((stage, index) => (
          <span
            key={stage.id}
            className={cn(
              "material-plan-step-dot h-1.5 rounded-full transition-all duration-500",
              index < currentIndex
                ? "w-1.5 bg-brand/35"
                : index === currentIndex
                  ? "w-9 bg-brand"
                  : "w-1.5 bg-muted",
            )}
          />
        ))}
      </div>

      <MaterialPlanOrbitVisualizer currentIndex={currentIndex} />

      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/18 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          正在生成学习计划
        </div>
        <h3 className="mt-3 text-xl font-semibold tracking-normal text-foreground">
          {GENERATION_STAGES[currentIndex]?.label ?? "生成学习计划"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{progressMessage}</p>
      </div>

      <div className="mt-5">
        {GENERATION_STAGES.map((stage, index) => (
          <MaterialPlanStageStatusItem
            key={stage.id}
            stage={stage}
            index={index}
            currentIndex={currentIndex}
          />
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            生成进度
          </p>
          <p className="text-sm font-medium text-foreground">{Math.round(progress)}%</p>
        </div>
        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="relative h-full overflow-hidden rounded-full bg-brand transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-y-0 w-16 animate-[material-plan-progress-shine_1.4s_ease-in-out_infinite] bg-white/35 blur-[1px]" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          生成会在后台继续处理。你可以先关闭弹框，回到学习工作台后会自动恢复进度。
        </p>
      </div>
    </div>
  )
}
