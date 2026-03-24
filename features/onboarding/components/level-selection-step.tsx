import { ArrowLeft, ArrowRight, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Level } from "@/features/onboarding/types"
import { getOnboardingPageMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"

type LevelSelectionStepProps = {
  selectedTools: string[]
  level: Level | null
  isPending: boolean
  onSelectLevel: (level: Level) => void
  onBack: () => void
  onFinish: () => void
}

export function LevelSelectionStep({
  selectedTools,
  level,
  isPending,
  onSelectLevel,
  onBack,
  onFinish,
}: LevelSelectionStepProps) {
  const { colorMap, levels, tools } = getOnboardingPageMock()
  const canFinish = level !== null

  return (
    <div className="w-1/2 overflow-y-auto scrollbar-none">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-6 py-6 mt-6">
        {/* 标题区域 - 更紧凑 */}
        <div className="mx-auto mb-5 max-w-2xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold-dim px-3 py-1 text-sm font-medium text-gold">
            <Target className="h-3.5 w-3.5" />
            第 2 步，共 2 步
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            你目前的编程水平是？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            我们会根据你的基础调整学习节奏和第一关的难度。
          </p>
        </div>

        {/* 已选工具提示 - 更紧凑 */}
        <div className="mx-auto mb-5 flex w-full max-w-3xl items-center gap-4 rounded-xl border border-border/60 bg-surface-2/75 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              你的工具组合
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedTools.map((id) => {
                const tool = tools.find((item) => item.id === id)
                if (!tool) return null

                return (
                  <span
                    key={id}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-md font-bold",
                      colorMap[tool.color],
                    )}
                  >
                    {tool.name}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="hidden rounded-lg border border-border/60 bg-background/70 px-3 py-2 sm:block">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
              生成后会得到
            </p>
            <p className="text-sm leading-5 text-foreground">
              第一关目标、AI 提示节奏、下一步待办任务...
            </p>
          </div>
        </div>

        {/* 水平选择卡片 - 更紧凑 */}
        <div className="mx-auto mb-5 grid w-full max-w-3xl gap-2.5">
          {levels.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectLevel(item.id)}
              aria-pressed={level === item.id}
              className={cn(
                "group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-300",
                level === item.id
                  ? "border-brand bg-brand-dim/65 shadow-[0_20px_54px_-28px_oklch(0.78_0.15_180/0.56)]"
                  : "border-border/60 bg-surface-2 hover:-translate-y-0.5 hover:border-border hover:bg-surface-1",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  level === item.id
                    ? "border-brand bg-brand"
                    : "border-border/60 bg-background group-hover:border-brand/40",
                )}
              >
                {level === item.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />
                )}
              </div>
              <div>
                <p className="text-base font-semibold">{item.label}</p>
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* 操作区 - 更紧凑 */}
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-4">
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
            {isPending ? "切换中..." : "生成学习路径并开始第一课"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            返回修改工具选择
          </button>
        </div>
      </div>
    </div>
  )
}
