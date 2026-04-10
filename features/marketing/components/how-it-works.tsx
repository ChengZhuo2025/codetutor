import React from "react"
import {
  marketingFitNotes,
  marketingSteps,
} from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"

export function LandingHowItWorks() {
  return (
    <section id="how" className="relative bg-surface-1 px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />

      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            学习方式
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            三步从 &ldquo;看过&rdquo; 走向 &ldquo;做成&rdquo;
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            不把一整套教程直接塞给你，而是先判断当前目标，再拆出一条能继续执行的路径。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] md:items-center md:gap-0">
          {marketingSteps.map((item, index) => {
            const Icon = item.icon
            const isLast = index === marketingSteps.length - 1
            return (
              <React.Fragment key={item.step}>
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-[30px] border p-8 backdrop-blur animate-fadeUp transition-all hover:-translate-y-1 hover:border-brand/24 hover:bg-brand/4 dark:hover:bg-surface-2",
                    item.panelClassName,
                    index === 0
                      ? "animate-delay-100"
                      : index === 1
                        ? "animate-delay-200"
                        : "animate-delay-300",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/18" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.04),transparent_32%)] opacity-80 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%)]" />

                  <div className="mb-8 flex items-center justify-between">
                    <div
                      className={cn(
                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all group-hover:scale-110",
                        item.iconPanelClassName,
                      )}
                    >
                      <Icon className={cn("h-6 w-6", item.color)} />
                    </div>
                    <span className="font-mono text-4xl font-bold text-muted-foreground/20">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                  <p className="mb-4 text-sm leading-7 text-muted-foreground">{item.description}</p>

                  {/* 预计时间 */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>预计 {index === 0 ? "3-5" : index === 1 ? "15-20" : "5-10"} 分钟</span>
                  </div>
                </div>

                {!isLast && (
                  <div className="hidden h-full items-center justify-center md:flex">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full  border border-border/70 bg-card shadow-md dark:border-white/10 dark:bg-surface-2/95 dark:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.8)]">
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        <div className="mx-auto mt-10 max-w-5xl grid gap-3 md:grid-cols-2">
          {marketingFitNotes.map((note, index) => (
            <div
              key={note.title}
              className="flex min-h-[96px] items-center gap-4 rounded-[24px]  border border-border/70 bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-brand/24 hover:bg-brand/4 animate-fadeUp dark:border-white/10 dark:bg-surface-2/85 dark:shadow-none dark:hover:bg-surface-2"
              style={{ animationDelay: `${400 + index * 100}ms` }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-md font-semibold text-foreground">{note.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{note.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
