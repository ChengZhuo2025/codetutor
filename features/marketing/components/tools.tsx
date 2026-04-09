import {
  marketingAudiences,
  marketingTools,
} from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"

export function LandingTools() {
  return (
    <section id="tools" className="relative px-6 py-24">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(0.96_0.01_240/0.55)_50%,oklch(0.94_0.008_240/0.85)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,oklch(0.12_0.008_240/0.6)_50%,oklch(0.10_0.006_240/0.9)_100%)]" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.78_0.15_180/0.08),transparent_50%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
      <div className="mx-auto max-w-6xl relative z-10 ">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="flex h-full flex-col">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              支持工具
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance">
              主流 AI 编程工具全部覆盖
            </h2>
            <p className="mb-8 max-w-xl text-sm leading-7 text-muted-foreground">
              先从你真正要用的工具开始学，而不是被迫套进统一课程。不同工具会有不同的起步任务和提示方式。
            </p>

            <div className="grid flex-1 content-start gap-3 sm:grid-cols-2">
              {marketingTools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex min-h-[82px] items-center rounded-[24px]  border border-border/70 bg-card px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-brand/24 hover:bg-brand/4 dark:border-white/10 dark:bg-surface-2/85 dark:shadow-none dark:hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full", tool.dot)} />
                    <div>
                      <p className="text-md font-bold">{tool.name}</p>
                      <p className="text-sm text-muted-foreground">{tool.tag}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-full flex-col">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              适合人群
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance">
              不需要先会编程，只需要先开始动手
            </h2>
            <p className="mb-8 max-w-xl text-sm leading-7 text-muted-foreground">
              无论你是想做原型、补齐实现能力，还是把 AI 工具真正引入项目流程，都能从一个更可执行的入口开始。
            </p>

            <div className="grid flex-1 content-start gap-3 sm:grid-cols-2">
              {marketingAudiences.map((item) => (
                <div
                  key={item.label}
                  className="flex min-h-[177px] flex-col justify-center rounded-[24px]  border border-border/70 bg-card px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-brand/24 hover:bg-brand/4 dark:border-white/10 dark:bg-surface-2/85 dark:shadow-none dark:hover:bg-surface-2"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-dim text-md font-bold text-brand">
                    {item.label[0]}
                  </div>
                  <p className="mt-4 text-md font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
