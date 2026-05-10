import type { PaymentChannel, PaymentPlanCode } from "@/lib/api/contracts/payment"

export type PlanActionState = {
  disabled: boolean
  label: string
  variant: "current" | "downgrade" | "renew" | "upgrade" | "unavailable"
}

export function getPlanActionState(input: {
  planCode: PaymentPlanCode | null
  isCurrent: boolean
  isDowngrade: boolean
  loadingPlanCode: PaymentPlanCode | null
}): PlanActionState {
  const isLoadingPaidPlan = Boolean(input.planCode && input.loadingPlanCode === input.planCode)

  if (input.isCurrent && !input.planCode) {
    return {
      disabled: true,
      label: "当前套餐",
      variant: "current",
    }
  }

  if (input.isCurrent) {
    return {
      disabled: isLoadingPaidPlan,
      label: isLoadingPaidPlan ? "创建订单中…" : "立即续费",
      variant: "renew",
    }
  }

  if (input.isDowngrade) {
    return {
      disabled: true,
      label: "已有更高级套餐",
      variant: "downgrade",
    }
  }

  if (!input.planCode) {
    return {
      disabled: true,
      label: "暂不可购买",
      variant: "unavailable",
    }
  }

  return {
    disabled: isLoadingPaidPlan,
    label: isLoadingPaidPlan ? "创建订单中…" : "升级套餐",
    variant: "upgrade",
  }
}

export function getPaymentOrderErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("支付配置未启用或不完整") || message.includes("PAYMENT_CONFIG_INCOMPLETE")) {
    return `当前暂未开放在线支付：${message.includes("支付配置") ? message : "支付配置未启用或不完整。"}请稍后再试，或联系管理员完成支付配置。`
  }
  return message || "支付订单创建失败，请稍后重试。"
}

export type PaymentChannelOption = {
  channel: PaymentChannel
  label: string
  description: string
}

export const PAYMENT_CHANNEL_OPTIONS: PaymentChannelOption[] = [
  {
    channel: "alipay",
    label: "支付宝",
    description: "支付宝扫码支付",
  },
  {
    channel: "wechat",
    label: "微信",
    description: "微信扫码支付",
  },
]
