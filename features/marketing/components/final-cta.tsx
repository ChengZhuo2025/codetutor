"use client"

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"

export function LandingFinalCta() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState()

  return (
    <section className="relative overflow-hidden px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(0.96_0.01_240/0.85)_50%,oklch(0.94_0.008_240/0.95)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,oklch(0.12_0.008_240/0.6)_50%,oklch(0.10_0.006_240/0.9)_100%)]" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.78_0.15_180/0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* 徽章标识 */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/12 px-5 py-2 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium text-brand">开始你的 AI 编程学习之旅</span>
        </div>

        {/* 主标题 */}
        <h2 className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
          从第一个可完成的
          <br />
          <span className="text-brand">AI 编程任务</span> 开始
        </h2>

        {/* 描述文案 */}
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
          不再只是收藏教程，让 CodeTutor 陪你真正学会 AI 编程工具。
          <br className="hidden sm:block" />
          每天只需要15分钟，从&ldquo;看过&rdquo;走向&ldquo;做成&rdquo;。
        </p>

        {/* CTA按钮组 */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href={ctaHref}>
            <Button
              size="lg"
              className="h-14 rounded-2xl bg-brand px-8 text-base font-semibold text-brand-foreground shadow-[0_24px_60px_-24px_oklch(0.78_0.15_180/0.82)] hover:-translate-y-0.5 hover:bg-brand/90"
            >
              {authState.status === "authenticated" ? ctaLabel : "立即开始学习"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="#how">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-border bg-card/90 px-8 text-base font-medium text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:bg-muted dark:border-white/10 dark:bg-[oklch(0.16_0.01_240/0.34)] dark:shadow-none dark:hover:bg-[oklch(0.20_0.015_220)]"
              >
                了解学习方式
              </Button>
            </Link>
        </div>

        {/* 信任提示 */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">
              <svg className="h-3 w-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>免费试用，每天30轮 AI 对话</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block dark:bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">
              <svg className="h-3 w-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>已支持 8+ 款主流 AI 编程工具</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block dark:bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20">
              <svg className="h-3 w-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>每天15分钟，学习效果看得见</span>
          </div>
        </div>
      </div>
    </section>
  )
}
