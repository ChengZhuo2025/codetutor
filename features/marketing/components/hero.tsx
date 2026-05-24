"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles";
import { LightRays } from "@/features/marketing/components/light-rays";
import { getToolName } from "@/constants/tools";
import { APP_EVENTS } from "@/constants/events";
import { marketingConversationMessages } from "@/features/marketing/data/marketing-content";
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider";
import { usePublicSite } from "@/features/site/providers/public-site-provider";
import { cn } from "@/lib/utils";
import { useAppEventTracker } from "@/providers/app-providers";

const heroStats = [
  { label: "支持工具", value: "8+" },
  { label: "首日任务", value: "15 分钟起" },
  { label: "学习方式", value: "Ai带你一步步操作" },
];

const cursorToolName = getToolName("cursor");
const claudeCodeToolName = getToolName("claude-code");
const codexToolName = getToolName("codex");
const heroFeaturedTools = [cursorToolName, claudeCodeToolName, "OpenCode"].join(
  "、",
);

export function LandingHero() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState();
  const { site } = usePublicSite();
  const { trackEvent } = useAppEventTracker();
  const { information } = site;

  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 pb-18 pt-30"
    >
      {/* WebGL：亮色降低强度，避免噪点/高光显得「脏」；暗色保持原视觉 */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.38] contrast-[0.98] dark:z-[1] dark:opacity-[0.96] dark:contrast-100">
        <LightRays
          raysOrigin="top-center"
          raysColor="#8fa0ff"
          raysSpeed={1.55}
          lightSpread={0.9}
          rayLength={2.35}
          fadeDistance={1.95}
          saturation={1.15}
          followMouse
          mouseInfluence={0.18}
          noiseAmount={0.012}
          distortion={0.075}
          className="opacity-100"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[1] dark:hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.55 0.02 240 / 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.55 0.02 240 / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] hidden dark:block"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.62 0.04 195 / 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.62 0.04 195 / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* 亮色：去掉四周压暗的「相框」，改为顶部柔和光晕；底部用页面底色做长距离融接，消除横向硬边 */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_95%_70%_at_50%_-12%,oklch(0.97_0.04_195/0.38),transparent_58%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_0%,transparent_38%,color-mix(in_oklch,var(--background)_55%,transparent)_72%,var(--background)_96%,var(--background)_100%)] dark:hidden" />
      <div className="pointer-events-none absolute inset-0 z-[1] hidden dark:block bg-[radial-gradient(ellipse_at_center,transparent_14%,oklch(0.12_0.008_270/0.62)_84%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] hidden dark:block bg-[linear-gradient(180deg,oklch(0.12_0.008_270/0.14),transparent_14%,transparent_78%,oklch(0.12_0.008_270/0.38)_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/40 px-4 py-1.5 text-sm text-brand backdrop-blur animate-fadeUp dark:border-brand/30 dark:bg-[oklch(0.60_0.24_270/0.20)]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{information.siteSubtitle} · MVP内测中</span>
        </div>

        <h1 className="max-w-5xl text-4xl font-semibold leading-[1.15] tracking-tight text-balance md:text-6xl lg:text-7xl animate-fadeUp animate-delay-100">
          {information.siteSlogan}
          <br />让 AI 导师陪你<span className="text-brand">真正做成</span>
        </h1>

        <p className="mt-5 max-w-4xl text-lg leading-8 text-muted-foreground text-pretty animate-fadeUp animate-delay-200">
          看到大V的{heroFeaturedTools}...等 AI 教程，收藏了就当学过了？
          <br />
          {information.siteName}
          会把教程内容拆分成一步步可实操练习的任务，并全程陪伴你、辅导你从&ldquo;看过&rdquo;走向&ldquo;学会&rdquo;。
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row animate-fadeUp animate-delay-300">
          <Button
            asChild
            size="lg"
            className={cn(
              "h-12 px-10 text-base font-semibold",
              USER_BUTTON_PRIMARY_CLASS,
            )}
          >
            <Link
              href={ctaHref}
              onClick={() =>
                trackEvent(APP_EVENTS.landingCtaClick, {
                  source: "marketing_hero_primary",
                  target: ctaHref,
                })
              }
            >
              {authState.status === "authenticated" ? ctaLabel : "免费开始学习"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <a
            href="#how"
            className={cn(
              "inline-flex h-12 items-center justify-center px-8 text-base font-medium",
              USER_BUTTON_SECONDARY_CLASS,
            )}
            onClick={() =>
              trackEvent(APP_EVENTS.landingCtaClick, {
                source: "marketing_hero_secondary",
                target: "#how",
              })
            }
          >
            看看学习方式
          </a>
        </div>

        <p className="mt-8 text-sm text-muted-foreground animate-fadeUp animate-delay-400">
          {information.siteDescription}
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3 animate-fadeUp animate-delay-500">
          {heroStats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-left shadow-[0_16px_36px_-28px_rgba(15,23,42,0.14)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand/24 hover:bg-brand/4 dark:border-white/10 dark:bg-surface-2/85 dark:shadow-none dark:hover:bg-surface-2"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-12 w-full max-w-5xl">
        <div className="overflow-hidden rounded-[32px] border border-border/80 bg-surface-2 shadow-[0_26px_80px_-38px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:shadow-[0_32px_90px_-45px_rgba(0,0,0,0.85)]">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-border/80 lg:border-b-0 lg:border-r lg:border-r-border/80 dark:border-white/10 dark:lg:border-r-white/10">
              <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3 dark:border-white/10">
                <div className="h-3 w-3 rounded-full bg-destructive/70" />
                <div className="h-3 w-3 rounded-full bg-gold/70" />
                <div className="h-3 w-3 rounded-full bg-brand/70" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">
                  AI 导师对话
                </span>
              </div>

              <div className="relative h-[31rem] overflow-hidden p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-18 bg-[linear-gradient(180deg,oklch(0.98_0.005_270/0.95),transparent)] dark:bg-[linear-gradient(180deg,oklch(0.14_0.01_270/0.78),transparent)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(180deg,transparent,oklch(0.98_0.005_270/0.92))] dark:bg-[linear-gradient(180deg,transparent,oklch(0.14_0.01_270/0.86))]" />

                <div className="animate-[hero-chat-scroll_26s_linear_infinite] space-y-4">
                  {[0, 1].flatMap((loop) =>
                    marketingConversationMessages.map((message) => (
                      <div key={`${loop}-${message.id}`} className="flex gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                            message.speaker === "user"
                              ? "bg-foreground/10 text-foreground dark:bg-white/8"
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
                              ? "rounded-tl-sm border border-border bg-muted/70 text-foreground dark:border-white/8 dark:bg-white/6"
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
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground dark:border-white/8 dark:bg-black/16">
                                {message.meta}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 leading-7 text-foreground/92">
                            {message.body}
                          </p>
                          {message.speaker === "ai" ? (
                            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted/90 px-3 py-2 dark:bg-black/18">
                              <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                              <span className="text-xs font-semibold text-gold">
                                陪练建议已生成
                              </span>
                              <span className="text-xs text-muted-foreground">
                                下一步会直接进入待办
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )),
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface-2/78 p-6 dark:bg-surface-2">
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
                    className={cn(
                      "rounded-2xl border px-4 py-3 backdrop-blur",
                      index === 0
                        ? "border-brand/26 bg-brand/12"
                        : "border-border/80 bg-surface-1/82 dark:border-white/8 dark:bg-white/4",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          index === 0
                            ? "bg-brand text-brand-foreground"
                            : "bg-foreground/10 text-muted-foreground dark:bg-white/8",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {index === 0
                            ? "预计 5 分钟，完成后继续下一步。"
                            : "随后自动解锁。"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-border/80 bg-surface-1/82 px-4 py-4 backdrop-blur-sm dark:border-white/8 dark:bg-white/4">
                <p className="text-xs text-muted-foreground">适合人群</p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  第一次接触 AI 编程工具的人，也包括已经能写代码、但想把{" "}
                  {cursorToolName}、{claudeCodeToolName}、{codexToolName}{" "}
                  真正接入自己项目流程的开发者。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["新手起步", "项目实战", "调试重构", "接口联调"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/80 bg-surface-2/90 px-2.5 py-1 text-xs text-muted-foreground dark:border-white/8 dark:bg-black/18"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
