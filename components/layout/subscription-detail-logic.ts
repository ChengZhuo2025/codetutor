import type { PaymentPlanCode } from "@/lib/api/contracts/payment"

export type PlanActionState = {
  disabled: boolean
  label: string
  variant: "current" | "downgrade" | "renew" | "upgrade"
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

  return {
    disabled: !input.planCode || isLoadingPaidPlan,
    label: isLoadingPaidPlan ? "创建订单中…" : "升级套餐",
    variant: "upgrade",
  }
}

export function getPaymentOrderErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("微信支付配置未启用或不完整") || message.includes("PAYMENT_CONFIG_INCOMPLETE")) {
    return "当前暂未开放在线支付：微信支付配置未启用或不完整。请稍后再试，或联系管理员完成支付配置。"
  }
  return message || "支付订单创建失败，请稍后重试。"
}
