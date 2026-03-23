import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LightRays } from "@/features/marketing/components/light-rays"

export function LandingHero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16">
      {/* Light rays animated background */}
      <LightRays />

      {/* Subtle grid overlay on top of rays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.26 0.008 240 / 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.26 0.008 240 / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial fade overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_80%)]" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-6 flex items-center gap-2 rounded-full border border-brand/30 bg-brand-dim px-4 py-1.5 text-sm text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI 编程学习陪练平台</span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-balance md:text-6xl lg:text-7xl">
          你负责找到
          <br />
          <span className="text-brand">想学的内容</span>
          <br />
          我负责陪你真正学会
        </h1>

        {/* Subheadline */}
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          把 Cursor、Claude Code、Trae 等 AI 编程教程转化为今天就能执行的步骤。
          在你卡住时持续陪练，用段位和学分记录每一步成长。
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/login">
            <Button
              size="lg"
              className="h-12 bg-brand px-8 text-base font-semibold text-brand-foreground hover:bg-brand/90"
            >
              免费开始学习
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how">
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-border/60 px-8 text-base text-muted-foreground hover:text-foreground"
            >
              了解学习方式
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-10 text-sm text-muted-foreground">
          已有 <span className="font-semibold text-foreground">2,400+</span> 位开发者正在使用 · 完全免费开始
        </p>
      </div>

      {/* Hero demo card */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-2 shadow-2xl">
          {/* Terminal bar */}
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-destructive/70" />
            <div className="h-3 w-3 rounded-full bg-gold/70" />
            <div className="h-3 w-3 rounded-full bg-brand/70" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">AI 导师对话</span>
          </div>
          {/* Chat demo */}
          <div className="space-y-4 p-6">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-4 text-xs font-semibold text-muted-foreground">
                我
              </div>
              <div className="rounded-xl rounded-tl-sm bg-surface-3 px-4 py-3 text-sm text-foreground">
                我在 B 站看到一个用 Cursor 做全栈项目的教程，但不知道怎么开始实践
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
                AI
              </div>
              <div className="space-y-2 rounded-xl rounded-tl-sm border border-brand/20 bg-brand-dim px-4 py-3 text-sm">
                <p className="font-medium text-brand">好的！我来帮你拆解第一步 👇</p>
                <p className="text-foreground">
                  <strong>当前目标：</strong>在本地成功打开 Cursor 并完成第一次 AI 对话
                </p>
                <p className="text-muted-foreground">
                  <strong>只需要做这一步：</strong>下载并安装 Cursor，然后用 Cmd+K 试着让它生成一个“Hello World”
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-surface-3 px-3 py-2">
                  <span className="text-gold text-xs font-semibold">+10 学分</span>
                  <span className="text-xs text-muted-foreground">完成后解锁下一关</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
