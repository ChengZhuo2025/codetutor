"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import { CalendarClock, Check, Crown, FileText, Lock, Loader2 } from "lucide-react"
import { marketingPlans } from "@/features/marketing/data/marketing-content"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DIALOG_GRADIENT_PANEL_CLASS,
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SubscriptionSnapshot } from "@/types/profile"
import { requestData } from "@/lib/api/client"
import type {
  PaymentOrderResponseData,
  PaymentPlanCode,
  SubscriptionMeResponseData,
  WechatNativeOrderResponseData,
} from "@/lib/api/contracts/payment"

type SubscriptionDetailDialogProps = {
  subscription: SubscriptionSnapshot
  children: ReactNode
}

export function SubscriptionDetailDialog({
  subscription,
  children,
}: SubscriptionDetailDialogProps) {
  const [open, setOpen] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionMeResponseData | null>(null)
  const [activeOrder, setActiveOrder] = useState<PaymentOrderResponseData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loadingPlanCode, setLoadingPlanCode] = useState<PaymentPlanCode | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  // 定义套餐等级顺序
  const planTierOrder = ["免费版", "个人版", "专业版"]
  const currentPlanName = subscriptionData?.current.planName ?? subscription.planName
  const currentPlanIndex = planTierOrder.indexOf(currentPlanName)
  const currentExpiresAt = subscriptionData?.current.expiresAt
    ? new Date(subscriptionData.current.expiresAt).toLocaleDateString("zh-CN")
    : subscription.expiresAt
  const currentRemainingDays = subscriptionData?.current.remainingDays ?? subscription.remainingDays

  useEffect(() => {
    if (!open) return
    void requestData<SubscriptionMeResponseData>("/subscription/me")
      .then(setSubscriptionData)
      .catch(() => setPaymentMessage("订阅信息读取失败，请稍后重试。"))
  }, [open])

  useEffect(() => {
    if (!activeOrder?.codeUrl) {
      setQrDataUrl(null)
      return
    }
    void QRCode.toDataURL(activeOrder.codeUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    }).then(setQrDataUrl)
  }, [activeOrder?.codeUrl])

  useEffect(() => {
    if (!activeOrder || activeOrder.status === "paid") return
    const timer = window.setInterval(() => {
      void requestData<PaymentOrderResponseData>(`/payment/orders/${activeOrder.orderNo}/sync`, {
        method: "POST",
      }).then((order) => {
        setActiveOrder(order)
        if (order.status === "paid") {
          setPaymentMessage("支付成功，订阅权益已开通。")
          void requestData<SubscriptionMeResponseData>("/subscription/me").then(setSubscriptionData)
        }
      }).catch(() => {
        setPaymentMessage("暂时无法同步支付状态，可稍后手动刷新。")
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeOrder])

  async function createPaymentOrder(planCode: PaymentPlanCode) {
    setLoadingPlanCode(planCode)
    setPaymentMessage(null)
    try {
      const order = await requestData<WechatNativeOrderResponseData>("/payment/wechat/native-orders", {
        method: "POST",
        body: JSON.stringify({ planCode }),
      })
      setActiveOrder(order)
      setPaymentMessage("请使用微信扫码完成支付，支付后页面会自动同步状态。")
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "支付订单创建失败，请稍后重试。")
    } finally {
      setLoadingPlanCode(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={cn(DIALOG_GRADIENT_PANEL_CLASS, "max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl scrollbar-none sm:max-w-[860px]")}>
        <div className="overflow-hidden rounded-2xl">
          {/* 头部 */}
          <div className={cn("border-b bg-[radial-gradient(circle_at_top_left,oklch(0.52_0.12_180/0.10),transparent_46%)] px-5 py-4 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.16),transparent_46%)]", USER_PANEL_DIVIDER_CLASS)}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                套餐订阅与续费
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm text-muted-foreground">
                当前使用 {currentPlanName}，可直接扫码完成套餐升级或续费。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
            {paymentMessage ? (
              <div className="rounded-xl border border-brand/20 bg-brand-dim/35 px-4 py-3 text-sm text-foreground">
                {paymentMessage}
              </div>
            ) : null}
            {activeOrder ? (
              <div className="grid gap-4 rounded-xl border border-border/70 bg-surface-1/95 p-4 md:grid-cols-[260px_1fr]">
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-3">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="微信支付二维码" className="h-60 w-60" />
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col justify-center gap-3">
                  <p className="text-lg font-semibold text-foreground">{activeOrder.planName}</p>
                  <p className="text-3xl font-bold text-foreground">¥{(activeOrder.amountCents / 100).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">
                    订单号：{activeOrder.orderNo}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    状态：{activeOrder.status === "paid" ? "已支付" : "等待支付"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void requestData<PaymentOrderResponseData>(`/payment/orders/${activeOrder.orderNo}/sync`, { method: "POST" })
                          .then(setActiveOrder)
                          .catch(() => setPaymentMessage("支付状态同步失败，请稍后重试。"))
                      }}
                    >
                      刷新支付状态
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setActiveOrder(null)}>
                      返回套餐
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            {/* 套餐列表 - 显示全部3个套餐 */}
            <div className="grid gap-4 md:grid-cols-3">
              {marketingPlans.map((plan) => {
                const isCurrent = plan.name === currentPlanName
                const planIndex = planTierOrder.indexOf(plan.name)
                const isDowngrade = planIndex < currentPlanIndex // 更低套餐
                const planCode =
                  plan.name === "个人版"
                    ? "personal_monthly"
                    : plan.name === "专业版"
                      ? "pro_monthly"
                      : null

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative flex flex-col rounded-xl border p-4 transition-all",
                      isCurrent
                        ? "border-brand/50 bg-brand-dim/50 ring-2 ring-brand/25"
                        : isDowngrade
                          ? "border-border/60 bg-surface-2/70 opacity-55 dark:border-border/70 dark:bg-surface-2/80"
                          : "border-border/70 bg-surface-1/95 shadow-sm dark:border-border/70 dark:bg-surface-2/90",
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
                        <Button
                          type="button"
                          disabled={!planCode || loadingPlanCode === planCode}
                          className={cn("w-full px-4 py-2.5 text-sm font-semibold", USER_BUTTON_PRIMARY_CLASS)}
                          onClick={() => planCode && void createPaymentOrder(planCode)}
                        >
                          {loadingPlanCode === planCode ? "创建订单中…" : "立即续费"}
                        </Button>
                      ) : isDowngrade ? (
                        // 更低套餐：不可点击的灰度按钮
                        <button
                          disabled
                          className={cn(
                            "flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium",
                            USER_PANEL_OUTLINE_BUTTON_CLASS,
                          )}
                        >
                          已有更高级套餐
                        </button>
                      ) : (
                        // 更高套餐：升级按钮
                        <Button
                          type="button"
                          disabled={!planCode || loadingPlanCode === planCode}
                          className={cn(
                            "w-full px-4 py-2.5 text-sm font-semibold",
                            plan.highlight ? USER_BUTTON_PRIMARY_CLASS : USER_PANEL_OUTLINE_BUTTON_CLASS,
                          )}
                          onClick={() => planCode && void createPaymentOrder(planCode)}
                        >
                          {loadingPlanCode === planCode ? "创建订单中…" : "升级套餐"}
                        </Button>
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
                      至 <span className="text-brand">{currentExpiresAt}</span>
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        （剩余 <span className="text-brand font-medium">{currentRemainingDays}</span> 天）
                      </span>
                    </p>
                  </div>
                </div>
                <Link
                  href="/login"
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", USER_PANEL_OUTLINE_BUTTON_CLASS)}
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
