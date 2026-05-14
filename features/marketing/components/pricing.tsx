"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"
import { marketingPlans } from "@/features/marketing/data/marketing-content"
import type { MarketingPlan } from "@/features/marketing/types"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"
import { requestData } from "@/lib/api/client"
import type { SubscriptionPlansResponseData } from "@/lib/api/contracts/payment"
import { cn } from "@/lib/utils"
import { useAppEventTracker } from "@/providers/app-providers"
import type { SubscriptionSnapshot } from "@/types/profile"

const SUBSCRIBE_INTENT_PARAM = "intent=subscribe"

const EMPTY_SUBSCRIPTION_SNAPSHOT: SubscriptionSnapshot = {
  planName: "免费版",
  planPriceLabel: "¥0.00",
  billingCycleLabel: "按需升级",
  expiresAt: "无期限",
  remainingDays: 0,
  quotaLabel: "选择套餐后立即开通订阅权益",
  renewalHint: "你可以选择适合当前学习节奏的套餐。",
  primaryActionLabel: "订阅套餐",
  secondaryActionLabel: "查看套餐",
}

function formatPlanPrice(priceCents: number) {
  return `¥${(priceCents / 100).toFixed(2)}`
}

function mapSubscriptionPlanToMarketingPlan(
  plan: SubscriptionPlansResponseData["plans"][number],
): MarketingPlan {
  return {
    name: plan.name,
    price: formatPlanPrice(plan.priceCents),
    period: plan.periodLabel,
    desc: plan.description,
    highlight: plan.highlight,
    features: plan.features,
    cta: plan.ctaLabel || (plan.purchasable ? "立即订阅" : "免费开始"),
    href: ROUTES.login,
    purchasable: plan.purchasable,
  }
}

export function LandingPricing() {
  const { authState, ctaHref, ctaLabel } = useLandingAuthState()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { trackEvent } = useAppEventTracker()
  const [plans, setPlans] = useState<MarketingPlan[]>(marketingPlans)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void requestData<SubscriptionPlansResponseData>("/subscription/plans")
      .then((data) => {
        if (!cancelled && data.plans.length > 0) {
          setPlans(data.plans.map(mapSubscriptionPlanToMarketingPlan))
        }
      })
      .catch(() => {
        if (!cancelled) setPlans(marketingPlans)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (authState.status !== "authenticated" || searchParams.get("intent") !== "subscribe") {
      return
    }

    const timer = window.setTimeout(() => setSubscriptionDialogOpen(true), 0)
    router.replace(ROUTES.home, { scroll: false })
    return () => window.clearTimeout(timer)
  }, [authState.status, router, searchParams])

  function handleSubscribeClick(plan: MarketingPlan) {
    const target = authState.status === "authenticated" ? "subscription-dialog" : `${ROUTES.login}?${SUBSCRIBE_INTENT_PARAM}`

    trackEvent(APP_EVENTS.landingCtaClick, {
      source: `marketing_pricing_${plan.name}`,
      target,
    })

    if (authState.status === "authenticated") {
      setSubscriptionDialogOpen(true)
      return
    }

    router.push(`${ROUTES.login}?${SUBSCRIBE_INTENT_PARAM}`)
  }

  return (
    <section id="pricing" className="relative bg-surface-1 px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />

      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            套餐订阅
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            先用免费版体验, 再决定是否持续升级
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            当前处于 MVP 内测阶段，定价用于表达能力层级与升级路径，正式联调前仍可能调整。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-[30px] border p-8 transition-all hover:-translate-y-1 hover:border-brand/40 hover:bg-brand/5",
                plan.highlight
                  ? "border-brand/40 bg-brand/5 shadow-lg shadow-brand/10 dark:bg-[linear-gradient(180deg,oklch(0.2_0.02_210/0.94),oklch(0.16_0.015_235/0.98))] dark:shadow-[0_24px_80px_-42px_oklch(0.78_0.15_180/0.28)]"
                  : "border-border bg-card shadow-md shadow-black/[0.06] dark:border-white/10 dark:bg-surface-2/88 dark:shadow-[0_20px_70px_-50px_rgba(0,0,0,0.72)]",
              )}
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
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.highlight ? "text-brand" : "text-muted-foreground",
                      )}
                    />
                    <span className="leading-6 text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.purchasable ? (
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "w-full h-11 px-8 text-base font-semibold",
                    plan.highlight ? USER_BUTTON_PRIMARY_CLASS : USER_BUTTON_SECONDARY_CLASS,
                  )}
                  onClick={() => handleSubscribeClick(plan)}
                >
                  {plan.cta}
                </Button>
              ) : (
                <Link href={authState.status === "authenticated" ? ctaHref : plan.href}>
                  <Button
                    size="lg"
                    className={cn(
                      "w-full h-11 px-8 text-base font-semibold",
                      plan.highlight ? USER_BUTTON_PRIMARY_CLASS : USER_BUTTON_SECONDARY_CLASS,
                    )}
                    onClick={() =>
                      trackEvent(APP_EVENTS.landingCtaClick, {
                        source: `marketing_pricing_${plan.name}`,
                        target: authState.status === "authenticated" ? ctaHref : plan.href,
                      })
                    }
                  >
                    {authState.status === "authenticated" ? ctaLabel : plan.cta}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      <SubscriptionDetailDialog
        subscription={EMPTY_SUBSCRIPTION_SNAPSHOT}
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
      />
    </section>
  )
}
