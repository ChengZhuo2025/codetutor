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
    <div className="w-1/2 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold-dim px-4 py-1.5 text-sm font-medium text-gold">
            <Target className="h-4 w-4" />
            第 2 步，共 2 步
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            你目前的编程水平是？
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            我们会根据你的基础调整学习节奏、提示密度和第一关的难度，避免太浅也避免一开始就过载。
          </p>
        </div>

        <div className="mx-auto mb-8 grid w-full max-w-4xl gap-4 rounded-[32px] border border-border/60 bg-surface-2/75 p-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              你的工具组合
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTools.map((id) => {
                const tool = tools.find((item) => item.id === id)
                if (!tool) return null

                return (
                  <span
                    key={id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      colorMap[tool.color],
                    )}
                  >
                    {tool.name}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              生成后会得到
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              第一关目标、AI 提示节奏、继续学习入口和下一步待办。
            </p>
          </div>
        </div>

        <div className="mx-auto mb-10 grid w-full max-w-4xl gap-4">
          {levels.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectLevel(item.id)}
              aria-pressed={level === item.id}
              className={cn(
                "group flex w-full items-start gap-4 rounded-[28px] border p-5 text-left transition-all duration-300",
                level === item.id
                  ? "border-brand bg-brand-dim/65 shadow-[0_20px_54px_-28px_oklch(0.78_0.15_180/0.56)]"
                  : "border-border/60 bg-surface-2 hover:-translate-y-0.5 hover:border-border hover:bg-surface-1",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  level === item.id
                    ? "border-brand bg-brand"
                    : "border-border/60 bg-background group-hover:border-brand/40",
                )}
              >
                {level === item.id && (
                  <div className="h-2 w-2 rounded-full bg-brand-foreground" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 rounded-[32px] border border-border/60 bg-surface-2/70 px-5 py-5">
          <Button
            onClick={onFinish}
            disabled={!canFinish || isPending}
            className={cn(
              "h-14 w-full max-w-md rounded-2xl text-base font-semibold shadow-[0_24px_64px_-26px_oklch(0.78_0.15_180/0.78)] transition-all",
              canFinish
                ? "bg-brand text-brand-foreground hover:-translate-y-0.5 hover:bg-brand/90"
                : "cursor-not-allowed opacity-40",
            )}
          >
            {isPending ? "切换中..." : "生成我的学习路径并开始第一课"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回修改工具选择
          </button>
          <p className="text-xs text-muted-foreground">
            这一步只影响起步节奏，后续学习过程中仍可动态调整。
          </p>
        </div>
      </div>
    </div>
  )
}
