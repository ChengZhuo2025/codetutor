"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LightRays } from "@/features/marketing/components/light-rays"
import { getToolName } from "@/constants/tools"
import { marketingConversationMessages } from "@/features/marketing/data/marketing-content"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"
import { cn } from "@/lib/utils"

const heroStats = [
  { label: "支持工具", value: "8+" },
  { label: "首日任务", value: "15 分钟起" },
  { label: "学习方式", value: "Ai带你一步步操作" },
]

const cursorToolName = getToolName("cursor")
const claudeCodeToolName = getToolName("claude-code")
const codexToolName = getToolName("codex")
const heroFeaturedTools = [cursorToolName, claudeCodeToolName, "OpenCode"].join("、")

export function LandingHero() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState()

  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-18 pt-28"
    >
      <LightRays
        raysOrigin="top-center"
        raysColor="#6ff4d8"
        raysSpeed={1.55}
        lightSpread={0.9}
        rayLength={2.35}
        fadeDistance={1.95}
        saturation={1.28}
        followMouse
        mouseInfluence={0.18}
        noiseAmount={0.012}
        distortion={0.075}
        className="opacity-[0.96]"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.28 0.015 220 / 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.28 0.015 220 / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_14%,oklch(0.12_0.008_240/0.68)_84%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,oklch(0.12_0.008_240/0.16),transparent_14%,transparent_82%,oklch(0.12_0.008_240/0.58)_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/18 bg-[oklch(0.2_0.02_220/0.38)] px-4 py-1.5 text-sm text-brand backdrop-blur animate-fadeUp">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI 编程学习陪练平台 · MVP内测中</span>
        </div>

        <h1 className="max-w-5xl text-4xl font-bold leading-[1.15] tracking-tight text-balance md:text-6xl lg:text-7xl animate-fadeUp animate-delay-100">
          收藏夹里的教程，不该只是看过
          <br />
          让 AI 导师陪你<span className="text-brand">真正做成</span>
        </h1>

        <p className="mt-5 max-w-4xl text-lg leading-8 text-muted-foreground text-pretty animate-fadeUp animate-delay-200">
          看到大V的{heroFeaturedTools}...等 AI 教程，收藏了就当学过了？<br/>
          CodeTutor AI 会把教程内容拆分成一步步可实操练习的任务，并全程陪伴你、辅导你从&ldquo;看过&rdquo;走向&ldquo;学会&rdquo;。
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row animate-fadeUp animate-delay-300">
          <Link href={ctaHref}>
            <Button
              size="lg"
              className="h-14 rounded-2xl bg-brand px-9 text-base font-semibold text-brand-foreground shadow-[0_24px_60px_-24px_oklch(0.78_0.15_180/0.82)] hover:-translate-y-0.5 hover:bg-brand/90"
            >
              {authState.status === "authenticated" ? ctaLabel : "免费开始学习"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a
            href="#how"
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-[oklch(0.16_0.01_240/0.34)] px-8 text-base font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-[oklch(0.2_0.015_220)] hover:text-foreground"
          >
            看看学习方式
          </a>
        </div>

        <p className="mt-8 text-sm text-muted-foreground animate-fadeUp animate-delay-400">
          适合刚开始上手 AI 编程工具的人，也适合想把&ldquo;看过教程&rdquo;变成&ldquo;做出结果&rdquo;的开发者。
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3 animate-fadeUp animate-delay-500">
          {heroStats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[oklch(0.17_0.01_240/0.38)] px-5 py-4 text-left backdrop-blur-md"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-16 w-full max-w-5xl">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[oklch(0.15_0.012_240/0.48)] shadow-[0_32px_90px_-45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-white/8 lg:border-b-0 lg:border-r lg:border-r-white/8">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-destructive/70" />
                <div className="h-3 w-3 rounded-full bg-gold/70" />
                <div className="h-3 w-3 rounded-full bg-brand/70" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">AI 导师对话</span>
              </div>

              <div className="relative h-[27rem] overflow-hidden p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-18 bg-[linear-gradient(180deg,oklch(0.14_0.01_240/0.78),transparent)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(180deg,transparent,oklch(0.14_0.01_240/0.86))]" />

                <div className="animate-[hero-chat-scroll_26s_linear_infinite] space-y-4">
                  {[0, 1].flatMap((loop) =>
                    marketingConversationMessages.map((message) => (
                      <div
                        key={`${loop}-${message.id}`}
                        className={cn(
                          "flex gap-3",
                          message.speaker === "user" ? "" : "",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                            message.speaker === "user"
                              ? "bg-white/8 text-foreground"
                              : message.speaker === "system"
                                ? "bg-gold/14 text-gold"
                                : "bg-brand text-brand-foreground",
                          )}
                        >
                          {message.speaker === "user"
                            ? "我"
                            : message.speaker === "system"
                              ? "任"
                              : "AI"}
                        </div>
                        <div
                          className={cn(
                            "max-w-[92%] rounded-2xl px-4 py-3 text-left text-sm backdrop-blur-sm",
                            message.speaker === "user"
                              ? "rounded-tl-sm border border-white/8 bg-white/6 text-foreground"
                              : message.speaker === "system"
                                ? "rounded-tl-sm border border-gold/18 bg-gold/10 text-foreground"
                                : "rounded-tl-sm border border-brand/18 bg-brand/12 text-foreground",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                                message.speaker === "ai"
                                  ? "text-brand"
                                  : message.speaker === "system"
                                    ? "text-gold"
                                    : "text-muted-foreground",
                              )}
                            >
                              {message.title}
                            </span>
                            {message.meta ? (
                              <span className="rounded-full border border-white/8 bg-black/16 px-2 py-0.5 text-[10px] text-muted-foreground">
                                {message.meta}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 leading-7 text-foreground/92">{message.body}</p>
                          {message.speaker === "ai" ? (
                            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/18 px-3 py-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                              <span className="text-xs font-semibold text-gold">陪练建议已生成</span>
                              <span className="text-xs text-muted-foreground">下一步会直接进入待办</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )),
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[oklch(0.14_0.01_240/0.3)] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                今日学习路径
              </p>
              <div className="mt-4 space-y-3">
                {[
                  `安装 ${cursorToolName} 编辑器`,
                  "打开一个本地项目文件夹",
                  "发起第一次 AI 对话",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-3 backdrop-blur ${
                      index === 0
                        ? "border-brand/26 bg-brand/12"
                        : "border-white/8 bg-white/4"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          index === 0
                            ? "bg-brand text-brand-foreground"
                            : "bg-white/8 text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {index === 0 ? "预计 5 分钟，完成后继续下一步。" : "随后自动解锁。"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground">适合人群</p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  第一次接触 AI 编程工具的人，也包括已经能写代码、但想把 {cursorToolName}、{claudeCodeToolName}、{codexToolName} 真正接入自己项目流程的开发者。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["新手起步", "项目实战", "调试重构", "接口联调"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/8 bg-black/18 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
