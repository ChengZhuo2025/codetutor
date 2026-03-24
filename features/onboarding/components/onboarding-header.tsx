import Link from "next/link"
import { Code2 } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { cn } from "@/lib/utils"

type OnboardingHeaderProps = {
  step: 1 | 2
}

const stepMeta = {
  1: {
    title: "选择工具",
    description: "先告诉我们你最想上手哪类 AI 编程工具。",
  },
  2: {
    title: "确认水平",
    description: "再根据当前基础生成适合你的第一条学习路径。",
  },
} as const

export function OnboardingHeader({ step }: OnboardingHeaderProps) {
  return (
    <header className="relative z-10 border-b border-border/50 bg-surface-1/80 px-6 py-5 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Logo - 与首页样式保持一致 */}
        <Link href={ROUTES.home} className="flex items-center gap-3 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.78_0.15_180/0.72)]">
            <Code2 className="h-[18px] w-[18px]" />
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1.06rem] font-extrabold tracking-tight">{APP_NAME}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              AI 编程学习教练
            </span>
          </div>
        </Link>

        {/* 桌面端步骤指示器 */}
        <div className="hidden items-center gap-6 md:flex">
          {[1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                  item === step
                    ? "border-brand bg-brand text-brand-foreground"
                    : item < step
                      ? "border-brand bg-brand-dim text-brand"
                      : "border-border bg-surface-2 text-muted-foreground",
                )}
              >
                {item}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    item === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {stepMeta[item as 1 | 2].title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stepMeta[item as 1 | 2].description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 移动端步骤指示器 */}
        <div className="flex items-center gap-2 md:hidden">
          {[1, 2].map((item) => (
            <div
              key={item}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                item === step
                  ? "w-7 bg-brand"
                  : item < step
                    ? "w-3 bg-brand/50"
                    : "w-3 bg-surface-4",
              )}
            />
          ))}
        </div>
      </div>
    </header>
  )
}
