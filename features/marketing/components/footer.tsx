"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Code2 } from "lucide-react"
import { APP_COPYRIGHT_YEAR, APP_NAME } from "@/constants/app"
import { Button } from "@/components/ui/button"
import { marketingTools } from "@/features/marketing/data/marketing-content"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"
import type { MarketingTool } from "@/features/marketing/types"
import { AboutDialog } from "./about-dialog"
import { ContactDialog } from "./contact-dialog"

type FooterMarketingTool = MarketingTool & {
  downloadUrl: string
  logoSrc: string
}

const featuredFooterTools = marketingTools.filter(
  (tool): tool is FooterMarketingTool =>
    Boolean(tool.featuredInFooter && tool.downloadUrl && tool.logoSrc)
)

export function LandingFooter() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState()

  return (
    <>
      <section id="about" className="relative px-6 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            今天就把第一条学习路径跑起来
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
            选择工具、确认水平，然后直接进入第一课。先从一个能完成的动作开始，再慢慢积累成真正的成长节奏。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={ctaHref}>
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-brand px-8 text-base font-semibold text-brand-foreground shadow-[0_24px_60px_-24px_oklch(0.78_0.15_180/0.82)] hover:-translate-y-0.5 hover:bg-brand/90"
              >
                {authState.status === "authenticated" ? ctaLabel : "立即行动"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#tools">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-white/10 bg-[oklch(0.16_0.01_240/0.34)] px-8 text-base font-medium text-foreground backdrop-blur transition-all hover:-translate-y-1 hover:bg-[oklch(0.20_0.015_220)] hover:text-foreground"
              >
                先看支持哪些工具
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="pt-10">
        <div className="mx-auto max-w-6xl">
          <div>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/14" />
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                相关应用下载
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/14" />
            </div>

            <div className="mt-10 pb-6 flex flex-wrap items-center justify-center gap-10 gap-y-5">
              {featuredFooterTools.map((tool) => (
                <a
                  key={tool.name}
                  href={tool.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex h-12 w-12 rounded-lg bg-white/5 border border-white/10 items-center justify-center">
                    <Image
                      src={tool.logoSrc}
                      alt={`${tool.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-md object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-brand">
                      {tool.name}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">{tool.tag}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 px-26 py-6 border-t border-border/50 bg-surface-2 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <Code2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium">{APP_NAME}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <AboutDialog
                triggerLabel="关于我们"
                triggerClassName="cursor-pointer transition-colors hover:text-foreground"
              />
              <span className="cursor-pointer transition-colors hover:text-foreground">隐私政策</span>
              <span className="cursor-pointer transition-colors hover:text-foreground">使用条款</span>
              <ContactDialog triggerClassName="cursor-pointer transition-colors hover:text-foreground" />
              <span className="cursor-pointer transition-colors hover:text-foreground">帮助中心</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {APP_COPYRIGHT_YEAR} {APP_NAME}. All rights reserved.
            </p>
          </div>
      </footer>
    </>
  )
}
