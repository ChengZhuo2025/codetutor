"use client"

import { useEffect, useState, type ReactNode, type SVGProps } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import { CalendarClock, Check, Crown, FileText, Loader2, Lock, MessageCircle } from "lucide-react"
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
import {
  PAYMENT_CHANNEL_OPTIONS,
  buildPaymentDialogTitle,
  getPaymentOrderErrorMessage,
  getPlanActionState,
} from "@/components/layout/subscription-detail-logic"
import type {
  AlipayPrecreateOrderResponseData,
  PaymentChannel,
  PaymentOrderResponseData,
  PaymentOrderStatus,
  PaymentPlanCode,
  SubscriptionMeResponseData,
  WechatNativeOrderResponseData,
} from "@/lib/api/contracts/payment"

type SubscriptionDetailDialogProps = {
  subscription: SubscriptionSnapshot
  children: ReactNode
}

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentOrderStatus>(["paid", "closed", "expired", "failed"])

function AlipayBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <text
        x="20"
        y="27"
        fill="currentColor"
        fontFamily="MiSans, PingFang SC, Microsoft YaHei, sans-serif"
        fontSize="25"
        fontWeight="800"
        textAnchor="middle"
      >
        支
      </text>
    </svg>
  )
}

function WechatPayBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M17.3 11.25c-5.12 0-9.28 3.48-9.28 7.78 0 2.49 1.4 4.71 3.57 6.14l-.8 2.42 2.95-1.4c1.1.4 2.3.62 3.56.62.36 0 .72-.02 1.07-.06a7.62 7.62 0 0 1-.5-2.72c0-4.35 3.8-7.9 8.62-8.2-1.35-2.7-4.86-4.58-9.19-4.58Z"
        fill="currentColor"
      />
      <path
        d="M27 17.2c-4.3 0-7.8 2.94-7.8 6.57s3.5 6.57 7.8 6.57c.98 0 1.92-.15 2.78-.43l2.48 1.17-.65-2.02c1.9-1.2 3.16-3.1 3.16-5.29 0-3.63-3.48-6.57-7.77-6.57Z"
        fill="currentColor"
      />
      <path d="M14.44 17.64a1.04 1.04 0 1 1-2.08 0 1.04 1.04 0 0 1 2.08 0ZM22.2 17.64a1.04 1.04 0 1 1-2.08 0 1.04 1.04 0 0 1 2.08 0ZM25.02 23.12a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0ZM31.47 23.12a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z" fill="#07C160" />
    </svg>
  )
}

function PaymentChannelIcon({ channel }: { channel: PaymentChannel }) {
  if (channel === "alipay") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1677ff] text-white shadow-sm">
        <AlipayBrandIcon className="h-7 w-7" aria-hidden="true" />
      </span>
    )
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#07c160] text-white shadow-sm">
      <WechatPayBrandIcon className="h-7 w-7" aria-hidden="true" />
    </span>
  )
}

function getPaymentStatusLabel(status: PaymentOrderStatus) {
  if (status === "paid") return "已支付"
  if (status === "closed") return "已关闭"
  if (status === "expired") return "已过期"
  if (status === "failed") return "支付失败"
  return "等待支付"
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
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannel>("alipay")
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const currentPlanName = subscriptionData?.current.planName ?? subscription.planName
  const plans = subscriptionData?.plans ?? []
  const currentPlan = plans.find((plan) => plan.code === subscriptionData?.current.planCode)
  const currentPlanTierRank = currentPlan?.tierRank ?? 0
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
    if (activeOrder.codeUrl.includes("<form")) {
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
    if (!activeOrder || TERMINAL_PAYMENT_STATUSES.has(activeOrder.status)) return
    const timer = window.setInterval(() => {
      void requestData<PaymentOrderResponseData>(`/payment/orders/${activeOrder.orderNo}/sync`, {
        method: "POST",
      }).then((order) => {
        setActiveOrder(order)
        if (order.status === "paid") {
          setPaymentMessage("支付成功，订阅权益已开通。")
          void requestData<SubscriptionMeResponseData>("/subscription/me").then(setSubscriptionData)
        } else if (order.status === "expired") {
          setPaymentMessage("支付二维码已过期，请重新创建订单。")
        } else if (order.status === "closed") {
          setPaymentMessage("支付订单已关闭，请重新创建订单。")
        } else if (order.status === "failed") {
          setPaymentMessage("支付失败，请重新创建订单。")
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
      const order = selectedPaymentChannel === "alipay"
        ? await requestData<AlipayPrecreateOrderResponseData>("/payment/alipay/precreate-orders", {
          method: "POST",
          body: JSON.stringify({ planCode }),
        })
        : await requestData<WechatNativeOrderResponseData>("/payment/wechat/native-orders", {
        method: "POST",
        body: JSON.stringify({ planCode }),
      })

      if (selectedPaymentChannel === "alipay" && order.codeUrl?.includes("<form")) {
        const container = document.createElement("div")
        container.innerHTML = order.codeUrl
        document.body.appendChild(container)
        const form = container.querySelector("form") as HTMLFormElement
        if (form) {
          form.submit()
          setPaymentMessage("正在跳转到支付宝...")
        }
        return
      }

      setActiveOrder(order)
      setPaymentDialogOpen(true)
      setPaymentMessage(`请使用${selectedPaymentChannel === "alipay" ? "支付宝" : "微信"}扫码完成支付，支付后页面会自动同步状态。`)
    } catch (error) {
      setPaymentMessage(getPaymentOrderErrorMessage(error))
    } finally {
      setLoadingPlanCode(null)
    }
  }

  function handlePaymentDialogOpenChange(nextOpen: boolean) {
    setPaymentDialogOpen(nextOpen)
  }

  function syncActiveOrder() {
    if (!activeOrder) return
    void requestData<PaymentOrderResponseData>(`/payment/orders/${activeOrder.orderNo}/sync`, { method: "POST" })
      .then((order) => {
        setActiveOrder(order)
        if (order.status === "paid") {
          setPaymentMessage("支付成功，订阅权益已开通。")
          void requestData<SubscriptionMeResponseData>("/subscription/me").then(setSubscriptionData)
        }
        if (order.status === "expired") setPaymentMessage("支付二维码已过期，请重新创建订单。")
        if (order.status === "closed") setPaymentMessage("支付订单已关闭，请重新创建订单。")
        if (order.status === "failed") setPaymentMessage("支付失败，请重新创建订单。")
      })
      .catch(() => setPaymentMessage("支付状态同步失败，请稍后重试。"))
  }

  return (
    <>
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
            {!activeOrder || !paymentDialogOpen ? (
              <div className="rounded-xl border border-border/70 bg-surface-1/95 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">选择支付方式</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {PAYMENT_CHANNEL_OPTIONS.map((option) => {
                    const selected = selectedPaymentChannel === option.channel

                    return (
                      <button
                        key={option.channel}
                        type="button"
                        onClick={() => setSelectedPaymentChannel(option.channel)}
                        aria-pressed={selected}
                        className={cn(
                          "group relative flex min-h-[74px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-brand bg-brand-dim/50 text-foreground"
                            : "border-border bg-surface-2/70 text-muted-foreground hover:border-brand/40 hover:text-foreground",
                        )}
                      >
                        <PaymentChannelIcon channel={option.channel} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="mt-1 block text-xs">{option.description}</span>
                        </span>
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center transition-colors",
                            selected
                              ? "text-brand"
                              : "rounded-full border border-border bg-surface-1 text-transparent group-hover:border-brand/40",
                          )}
                          aria-hidden="true"
                        >
                          {selected ? <Check className="h-5 w-5 stroke-[3]" /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
            {/* 套餐列表 - 显示全部3个套餐 */}
            {plans.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-surface-1/95 px-4 py-6 text-sm text-muted-foreground">
                正在读取订阅套餐…
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => {
                const isCurrent = plan.name === currentPlanName
                const isDowngrade = plan.tierRank < currentPlanTierRank
                const planCode = plan.purchasable ? plan.code : null
                const actionState = getPlanActionState({
                  planCode,
                  isCurrent,
                  isDowngrade,
                  loadingPlanCode,
                })

                return (
                  <div
                    key={plan.code}
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
                          ¥{(plan.priceCents / 100).toFixed(plan.priceCents % 100 === 0 ? 0 : 2)}
                        </span>
                        {plan.periodLabel && (
                          <span className="text-sm text-muted-foreground">{plan.periodLabel}</span>
                        )}
                      </div>
                      {plan.description && (
                        <p className={cn(
                          "mt-1 text-xs",
                          isDowngrade ? "text-muted-foreground/40" : "text-muted-foreground"
                        )}>
                          {plan.description}
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
                      {actionState.variant === "downgrade" || actionState.variant === "current" || actionState.variant === "unavailable" ? (
                        <Button
                          type="button"
                          disabled
                          variant="outline"
                          className={cn(
                            "w-full px-4 py-2.5 text-sm font-semibold",
                            actionState.variant === "current"
                              ? USER_BUTTON_PRIMARY_CLASS
                              : USER_PANEL_OUTLINE_BUTTON_CLASS,
                          )}
                        >
                          {actionState.label}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={actionState.disabled}
                          className={cn(
                            "w-full px-4 py-2.5 text-sm font-semibold",
                            plan.highlight ? USER_BUTTON_PRIMARY_CLASS : USER_PANEL_OUTLINE_BUTTON_CLASS,
                          )}
                          onClick={() => planCode && void createPaymentOrder(planCode)}
                        >
                          {actionState.label}
                        </Button>
                      )}
                    </div>
                  </div>
                )
                })}
              </div>
            )}

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
                  href="/orders"
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
    <Dialog open={paymentDialogOpen} onOpenChange={handlePaymentDialogOpenChange}>
      <DialogContent className={cn(DIALOG_GRADIENT_PANEL_CLASS, "max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-[520px]")}>
        <div className={cn("border-b px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageCircle className="h-5 w-5 text-brand" />
              {buildPaymentDialogTitle(activeOrder?.paymentChannel ?? selectedPaymentChannel)}
            </DialogTitle>
            <DialogDescription>
              {activeOrder ? `订单 ${activeOrder.orderNo} 正在等待支付。` : "正在准备支付二维码。"}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-5 pb-5 pt-4">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-border/60 bg-white p-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="微信支付二维码" className="h-full w-full" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">套餐</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{activeOrder?.planName ?? "读取中"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">金额</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  ¥{activeOrder ? (activeOrder.amountCents / 100).toFixed(activeOrder.amountCents % 100 === 0 ? 0 : 2) : "--"}
                </p>
              </div>
              <p className="break-all text-sm text-muted-foreground">
                订单号：{activeOrder?.orderNo ?? "--"}
              </p>
              <p className="text-sm text-muted-foreground">
                状态：{activeOrder ? getPaymentStatusLabel(activeOrder.status) : "等待支付"}
              </p>
              <p className="text-sm leading-5 text-muted-foreground">
                请使用微信扫码完成支付，支付后页面会自动同步状态。
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={USER_PANEL_OUTLINE_BUTTON_CLASS}
              onClick={() => handlePaymentDialogOpenChange(false)}
            >
              返回套餐
            </Button>
            {activeOrder ? (
              <Button
                type="button"
                className={USER_BUTTON_PRIMARY_CLASS}
                disabled={TERMINAL_PAYMENT_STATUSES.has(activeOrder.status)}
                onClick={syncActiveOrder}
              >
                刷新支付状态
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
