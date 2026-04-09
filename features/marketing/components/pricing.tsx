"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { marketingPlans } from "@/features/marketing/data/marketing-content"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"

export function LandingPricing() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState()

  return (
    <section id="pricing" className="relative bg-surface-1 px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />

      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            套餐订阅
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            先用免费版体验，再决定是否持续升级
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            当前处于 MVP 内测阶段，定价用于表达能力层级与升级路径，正式联调前仍可能调整。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {marketingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[30px] border p-8 transition-all hover:-translate-y-1 ${
                plan.highlight
                  ? "border-brand/40 bg-brand/5 shadow-lg shadow-brand/10 dark:bg-[linear-gradient(180deg,oklch(0.2_0.02_210/0.94),oklch(0.16_0.015_235/0.98))] dark:shadow-[0_24px_80px_-42px_oklch(0.78_0.15_180/0.28)]"
                  : "border-border bg-card shadow-md shadow-black/[0.06] dark:border-white/10 dark:bg-surface-2/88 dark:shadow-[0_20px_70px_-50px_rgba(0,0,0,0.72)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-brand/40 bg-brand px-4 py-1 text-xs font-semibold text-brand-foreground">
                  MVP 推荐
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.desc}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        plan.highlight ? "text-brand" : "text-muted-foreground"
                      }`}
                    />
                    <span className="leading-6 text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={
                  authState.status === "authenticated" && plan.name === "免费版"
                    ? ctaHref
                    : plan.href
                }
              >
                <Button
                  className={`w-full rounded-2xl font-semibold ${
                    plan.highlight
                      ? "bg-brand text-brand-foreground shadow-[0_20px_50px_-24px_oklch(0.78_0.15_180/0.68)] hover:-translate-y-0.5 hover:bg-brand/90"
                      : "border border-border bg-muted/60 text-foreground hover:-translate-y-0.5 hover:bg-muted dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8"
                  }`}
                >
                  {authState.status === "authenticated" && plan.name === "免费版"
                    ? ctaLabel
                    : plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
