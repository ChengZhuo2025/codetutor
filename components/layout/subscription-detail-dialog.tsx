"use client"

import { useEffect, useState, type ReactNode } from "react"
import QRCode from "qrcode"
import { CalendarClock, Check, CheckCircle2, Crown, FileText, Loader2, Lock, MessageCircle, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SubscriptionSnapshot } from "@/types/profile"
import { requestData } from "@/lib/api/client"
import {
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
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentOrderStatus>(["paid", "closed", "expired", "failed"])

function getPaymentStatusLabel(status: PaymentOrderStatus) {
  if (status === "paid") return "已支付"
  if (status === "closed") return "已关闭"
  if (status === "expired") return "已过期"
  if (status === "failed") return "支付失败"
  return "等待支付"
}

function getPaymentResultCopy(status: PaymentOrderStatus | undefined) {
  if (status === "paid") {
    return {
      title: "支付成功",
      description: "订阅权益已开通，学习进度将持续保留。",
      toneClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
      iconWrapClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
      showPendingHint: false,
    }
  }
  if (status === "expired") {
    return {
      title: "支付已过期",
      description: "二维码已过有效期，请返回套餐页重新发起支付。",
      toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      icon: XCircle,
      iconWrapClass: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300",
      showPendingHint: false,
    }
  }
  if (status === "closed") {
    return {
      title: "支付已关闭",
      description: "订单已关闭，请返回套餐页重新发起支付。",
      toneClass: "border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      icon: XCircle,
      iconWrapClass: "border-slate-500/30 bg-slate-500/15 text-slate-600 dark:text-slate-300",
      showPendingHint: false,
    }
  }
  if (status === "failed") {
    return {
      title: "支付失败",
      description: "支付未完成，请返回套餐页重新发起支付。",
      toneClass: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      icon: XCircle,
      iconWrapClass: "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300",
      showPendingHint: false,
    }
  }
  return {
    title: "微信扫码支付",
    description: "请使用微信扫码完成支付，系统会自动同步支付状态。",
    toneClass: "border-brand/30 bg-brand-dim/35 text-foreground",
    icon: MessageCircle,
    iconWrapClass: "border-brand/30 bg-brand/15 text-brand",
    showPendingHint: true,
  }
}

export function SubscriptionDetailDialog({
  subscription,
  children,
  open: controlledOpen,
  onOpenChange,
}: SubscriptionDetailDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = controlledOpen ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionMeResponseData | null>(null)
  const [activeOrder, setActiveOrder] = useState<PaymentOrderResponseData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loadingPlanCode, setLoadingPlanCode] = useState<PaymentPlanCode | null>(null)
  const [selectedPaymentChannel] = useState<PaymentChannel>("wechat")
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
    if (!dialogOpen) return
    void requestData<SubscriptionMeResponseData>("/subscription/me")
      .then(setSubscriptionData)
      .catch(() => setPaymentMessage("订阅信息读取失败，请稍后重试。"))
  }, [dialogOpen])

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

  function handleViewOrders() {
    setPaymentDialogOpen(false)
    setActiveOrder(null)
    setQrDataUrl(null)
    setDialogOpen(false)
    if (window.location.pathname !== "/orders") {
      window.location.assign("/orders")
    }
  }

  const paymentView = activeOrder?.status === "paid"
    ? "success"
    : activeOrder && TERMINAL_PAYMENT_STATUSES.has(activeOrder.status)
      ? "failed"
      : "pending"
  const paymentResultCopy = getPaymentResultCopy(activeOrder?.status)

  return (
    <>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto scrollbar-none sm:max-w-[860px] p-0">
        <div className="overflow-hidden rounded-2xl">
          {/* 头部 */}
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                套餐订阅与续费
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                您已订阅 <span className="text-primary font-bold">{currentPlanName}</span>，可直接扫码完成套餐升级或续费。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
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
                <button
                  type="button"
                  onClick={handleViewOrders}
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", USER_PANEL_OUTLINE_BUTTON_CLASS)}
                >
                  <FileText className="h-4 w-4" />
                  订阅记录
                </button>
              </div>
            </div>

            {!activeOrder || !paymentDialogOpen ? (
              <>
                {/*
                  暂时隐藏“选择支付方式”卡片。
                  原逻辑保留在注释中，后续支付宝网页应用资质通过后可恢复。
                */}
                {/*
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
                */}
              </>
            ) : null}
            
            {/* 套餐列表 - 显示全部3个套餐 */}
            {plans.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-surface-1/95 px-4 py-6 text-sm text-muted-foreground">
                正在读取订阅套餐…
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 py-3">
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
                      "relative flex flex-col rounded-xl border pt-4 px-5 pb-5 transition-all",
                      isCurrent
                        ? "border-brand/70 bg-brand/10 ring-4 ring-brand/10"
                        : isDowngrade
                          ? "border-border bg-surface-3"
                          : "border-border/70 bg-surface-2",
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
                          ¥{(plan.priceCents / 100).toFixed(2)}
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

            {paymentMessage ? (
              <div className="rounded-3xl border border-gold/15 bg-gold-dim/35 px-4 py-3 text-sm text-foreground">
                {paymentMessage}
              </div>
            ) : null}

            {/* 底部提示 - flex 布局 */}
            <div className="flex items-start justify-center gap-8 pb-3 px-0">
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
      <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-[480px]">
        <div className={cn("border-b px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {paymentView === "pending" ? (
                <>
                  <MessageCircle className="h-5 w-5 text-brand" />
                  {buildPaymentDialogTitle(activeOrder?.paymentChannel ?? selectedPaymentChannel)}
                </>
              ) : (
                <>
                  <paymentResultCopy.icon className={cn("h-5 w-5", paymentView === "success" ? "text-emerald-500" : "text-rose-500")} />
                  {paymentResultCopy.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {paymentView === "pending"
                ? (activeOrder ? `订单 ${activeOrder.orderNo} 正在等待支付。` : "正在准备支付二维码。")
                : paymentResultCopy.description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-5 pb-5 pt-4">
          {paymentView === "pending" ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface-1/95 p-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,oklch(0.82_0.09_160/0.28),transparent_70%)]" />
                <div className="relative space-y-4">
                  <div className="mx-auto flex h-[248px] w-[248px] items-center justify-center rounded-2xl border border-border/60 bg-white p-3 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.72)]">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="微信支付二维码" className="h-full w-full" />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-center text-sm leading-6 text-muted-foreground">
                    请使用微信扫码完成支付，支付成功后会自动切换到结果状态。
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-2/70 p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">套餐</span>
                    <span className="text-right font-semibold text-foreground">{activeOrder?.planName ?? "读取中"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">金额</span>
                    <span className="text-right text-2xl font-bold text-foreground">
                      ¥{activeOrder ? (activeOrder.amountCents / 100).toFixed(2) : "--"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">订单号</span>
                    <span className="max-w-[68%] break-all text-right text-foreground/85">{activeOrder?.orderNo ?? "--"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">状态</span>
                    <span className="text-right text-foreground/85">{activeOrder ? getPaymentStatusLabel(activeOrder.status) : "等待支付"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={cn("rounded-2xl border p-5", paymentResultCopy.toneClass)}>
                <div className="flex flex-col items-center text-center">
                  <div className={cn("mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border", paymentResultCopy.iconWrapClass)}>
                    <paymentResultCopy.icon className="h-8 w-8" />
                  </div>
                  <p className="text-2xl font-semibold">{paymentResultCopy.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{paymentResultCopy.description}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface-2/70 p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">套餐</span>
                    <span className="text-right font-semibold text-foreground">{activeOrder?.planName ?? "读取中"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">金额</span>
                    <span className="text-right text-xl font-bold text-foreground">
                      ¥{activeOrder ? (activeOrder.amountCents / 100).toFixed(2) : "--"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">订单号</span>
                    <span className="max-w-[68%] break-all text-right text-foreground/85">{activeOrder?.orderNo ?? "--"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">状态</span>
                    <span className="text-right text-foreground/85">{activeOrder ? getPaymentStatusLabel(activeOrder.status) : "--"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {paymentView === "success" ? (
            <div className="mt-5">
              <Button type="button" className={cn("w-full", USER_BUTTON_PRIMARY_CLASS)} onClick={handleViewOrders}>
                <FileText className="h-4 w-4" />
                查看订阅记录
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
