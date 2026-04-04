"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarClock, Check, Crown, FileText, Lock } from "lucide-react"
import { marketingPlans } from "@/features/marketing/data/marketing-content"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DIALOG_DARK_GRADIENT_PANEL_CLASS } from "@/components/ui/surface-styles"
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
  // 定义套餐等级顺序
  const planTierOrder = ["免费版", "个人版", "专业版"]
  const currentPlanIndex = planTierOrder.indexOf(subscription.planName)

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={cn(DIALOG_DARK_GRADIENT_PANEL_CLASS, "max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl scrollbar-none sm:max-w-[860px]")}>
        <div className="overflow-hidden rounded-2xl">
          {/* 头部 */}
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.16),transparent_46%)] px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                套餐订阅与续费
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm text-muted-foreground">
                当前使用 {subscription.planName}，可直接查看权益并完成续费决策。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
            {/* 套餐列表 - 显示全部3个套餐 */}
            <div className="grid gap-4 md:grid-cols-3">
              {marketingPlans.map((plan) => {
                const isCurrent = plan.name === subscription.planName
                const planIndex = planTierOrder.indexOf(plan.name)
                const isDowngrade = planIndex < currentPlanIndex // 更低套餐

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative flex flex-col rounded-xl border p-4 transition-all",
                      isCurrent
                        ? "border-brand/50 bg-brand-dim/50 ring-2 ring-brand/25"
                        : isDowngrade
                          ? "border-white/5 bg-white/[0.02] opacity-55"
                          : "border-white/10 bg-white/5",
                    )}
                  >
                    {/* 当前套餐标签 */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
                          <Crown className="h-3 w-3" />
                          当前套餐
                        </span>
                      </div>
                    )}

                    <div className={cn("mb-3", isCurrent && "mt-2")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-base font-semibold",
                          isDowngrade ? "text-foreground/50" : "text-foreground"
                        )}>
                          {plan.name}
                        </p>
                        {isDowngrade && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className={cn(
                          "text-2xl font-bold",
                          isDowngrade ? "text-foreground/40" : "text-foreground"
                        )}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        )}
                      </div>
                      {plan.desc && (
                        <p className={cn(
                          "mt-1 text-xs",
                          isDowngrade ? "text-muted-foreground/40" : "text-muted-foreground"
                        )}>
                          {plan.desc}
                        </p>
                      )}
                    </div>

                    <ul className="flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isDowngrade ? "text-muted-foreground/30" : "text-brand"
                          )} />
                          <span className={cn(
                            "leading-5",
                            isDowngrade ? "text-foreground/40" : "text-foreground/85"
                          )}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* 按钮区域 */}
                    <div className="mt-4">
                      {isCurrent ? (
                        // 当前套餐：续费按钮
                        <Link
                          href="/login"
                          className="flex items-center justify-center rounded-xl border border-brand/40 bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
                        >
                          立即续费
                        </Link>
                      ) : isDowngrade ? (
                        // 更低套餐：不可点击的灰度按钮
                        <button
                          disabled
                          className="flex w-full items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
                        >
                          已有更高级套餐
                        </button>
                      ) : (
                        // 更高套餐：升级按钮
                        <Link
                          href="/login"
                          className={cn(
                            "flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                            plan.highlight
                              ? "bg-brand text-white hover:bg-brand/90"
                              : "border border-white/15 bg-white/5 text-foreground hover:border-white/25 hover:bg-white/10"
                          )}
                        >
                          升级套餐
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 当前套餐有效期信息 - 独立通栏卡片 */}
            <div className="rounded-xl border border-brand/25 bg-brand-dim/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/15 text-brand">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">当前订阅有效期</p>
                    <p className="text-base font-semibold text-foreground">
                      至 <span className="text-brand">{subscription.expiresAt}</span>
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        （剩余 <span className="text-brand font-medium">{subscription.remainingDays}</span> 天）
                      </span>
                    </p>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" />
                  订阅记录
                </Link>
              </div>
            </div>

            {/* 底部提示 - flex 布局 */}
            <div className="flex items-start justify-center gap-8 pt-1">
              {[
                "学习记录、会话历史和阶段进度保持连续",
                "升级后可立即解锁更多陪练频次",
                "已聚合套餐差异，无需跳转页面",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-brand">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
