"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarClock, Check, Crown, Sparkles } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { marketingPlans } from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"
import type { SubscriptionSnapshot } from "@/types/profile"

type SubscriptionDetailDialogProps = {
  subscription: SubscriptionSnapshot
  children: ReactNode
}

export function SubscriptionDetailDialog({
  subscription,
  children,
}: SubscriptionDetailDialogProps) {
  const paidPlans = marketingPlans.filter((plan) => plan.name !== "免费版")

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl rounded-2xl border-white/10 bg-[linear-gradient(180deg,oklch(0.22_0.02_235/0.98),oklch(0.17_0.015_250/0.98))] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] overflow-y-auto scrollbar-none sm:max-w-[820px]">
        <div className="overflow-hidden rounded-2xl">
          {/* 头部 */}
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.16),transparent_46%)] px-4 py-4 sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                套餐订阅与续费
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-xs leading-2 text-muted-foreground">
                当前使用 {subscription.planName}，可直接查看权益并完成续费决策。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-4 py-3 sm:px-5">
            {/* 当前订阅卡片 */}
            <div className="rounded-xl border border-brand/20 bg-brand-dim/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/12 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    <Sparkles className="h-3 w-3" />
                    当前订阅
                  </div>
                  <p className="text-sm font-semibold text-foreground">{subscription.planName}</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription.planPriceLabel} · {subscription.billingCycleLabel}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold-dim text-gold">
                  <Crown className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2.5 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  <CalendarClock className="h-3 w-3 text-chart-3" />
                  到期与权益
                </div>
                <p className="mt-1 text-xs text-foreground">
                  有效期至 <span className="font-semibold">{subscription.expiresAt}</span>
                  · 剩余 {subscription.remainingDays} 天
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                  {subscription.quotaLabel}
                </p>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <Link
                  href={ROUTES.login}
                  className="flex items-center justify-center rounded-xl border border-brand/25 bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                >
                  {subscription.secondaryActionLabel}
                </Link>
                <Link
                  href={ROUTES.login}
                  className="flex items-center justify-center rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-border hover:bg-white/8"
                >
                  {subscription.primaryActionLabel}
                </Link>
              </div>
            </div>

            {/* 套餐对比卡片 */}
            <div className="grid gap-3 md:grid-cols-2">
              {paidPlans.map((plan) => {
                const isCurrent = plan.name === subscription.planName

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "flex flex-col rounded-xl border p-3 transition-all",
                      isCurrent
                        ? "border-brand/30 bg-brand-dim/35"
                        : "border-white/10 bg-white/5",
                    )}
                  >
                    <div className="mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                        {isCurrent ? (
                          <span className="rounded-full border border-brand/20 bg-brand/12 px-1.5 py-0.5 text-[9px] font-semibold text-brand">
                            当前
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-foreground">{plan.price}</span>
                        {plan.period ? (
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        ) : null}
                      </div>
                    </div>

                    <ul className="flex-1 space-y-1.5">
                      {plan.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5 text-xs">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          <span className="leading-4 text-foreground/85">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.href}
                      className={cn(
                        "mt-3 flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                        isCurrent
                          ? "border border-border/60 bg-white/5 text-foreground hover:border-border hover:bg-white/8"
                          : plan.highlight
                            ? "bg-brand text-brand-foreground hover:bg-brand/90"
                            : "border border-border/60 bg-white/5 text-foreground hover:border-border hover:bg-white/8",
                      )}
                    >
                      {isCurrent ? "续费当前" : plan.cta}
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* 为什么在这里下单 */}
            <div className="py-3">
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {[
                  "学习记录、会话历史和阶段进度保持连续。",
                  "升级后可立即解锁更多陪练频次。",
                  "已聚合套餐差异，无需跳转页面。",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-brand">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    <span className="leading-4">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
