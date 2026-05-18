"use client"

import Image from "next/image"
import Link from "next/link"
import { Code2 } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import type { OnboardingStep } from "@/features/onboarding/types"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import { cn } from "@/lib/utils"

type OnboardingHeaderProps = {
  step: OnboardingStep
}

const stepMeta = {
  1: {
    title: "选主工具",
    description: "选一个你最想先练熟的工具，后面的推荐都围绕它。",
  },
  2: {
    title: "选基础",
    description: "按真实情况选即可，我们会据此安排难度和节奏。",
  },
  3: {
    title: "选怎么学",
    description: "跟平台路线一步步练，或用你自己的教程自学。",
  },
} as const

export function OnboardingHeader({ step }: OnboardingHeaderProps) {
  const { site } = usePublicSite()
  const { information } = site

  return (
    <header className="relative z-10 border-b border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,251,0.82))] px-6 py-5 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.28)] backdrop-blur dark:bg-[linear-gradient(180deg,oklch(0.19_0.012_250/0.92),oklch(0.16_0.01_250/0.82))]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Logo - 与首页样式保持一致 */}
        <Link href={ROUTES.home} className="flex items-center gap-3 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.78_0.15_180/0.72)]">
            {information.logoUrl ? (
              <Image
                src={information.logoUrl}
                alt={`${information.siteName} logo`}
                width={36}
                height={36}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <Code2 className="h-[18px] w-[18px]" />
            )}
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1.06rem] font-extrabold tracking-tight">{information.siteName}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {information.siteSubtitle}
            </span>
          </div>
        </Link>

        {/* 桌面端步骤指示器 */}
        <div className="hidden items-center gap-6 md:flex">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                  item === step
                    ? "border-brand/40 bg-brand text-brand-foreground shadow-[0_16px_36px_-22px_oklch(0.78_0.15_180/0.8)]"
                    : item < step
                      ? "border-brand/25 bg-brand/12 text-brand"
                      : "border-border/70 bg-surface-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
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
                  {stepMeta[item as OnboardingStep].title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stepMeta[item as OnboardingStep].description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 移动端步骤指示器 */}
        <div className="flex items-center gap-2 md:hidden">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                item === step
                  ? "w-7 bg-brand"
                  : item < step
                    ? "w-3 bg-brand/45"
                    : "w-3 bg-surface-4",
              )}
            />
          ))}
        </div>
      </div>
    </header>
  )
}
