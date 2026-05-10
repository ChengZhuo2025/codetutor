export type PaymentPlanCode = string

export const PAYMENT_ORDER_STATUSES = [
  "created",
  "prepay_created",
  "paid",
  "closed",
  "expired",
  "failed",
] as const
export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUSES)[number]

export type SubscriptionPlanItem = {
  code: PaymentPlanCode
  name: string
  priceCents: number
  currency: "CNY"
  durationDays: number
  tierRank: number
  description: string
  features: string[]
  periodLabel: string
  ctaLabel: string
  highlight: boolean
  purchasable: boolean
  active: boolean
  displayOrder: number
  archivedAt: string | null
  createdAt?: string
  updatedAt?: string
}

export type SubscriptionPlansResponseData = {
  plans: SubscriptionPlanItem[]
}

export type SubscriptionMeResponseData = {
  current: {
    planCode: string
    planName: string
    status: "free" | "active" | "expired"
    startsAt: string | null
    expiresAt: string | null
    remainingDays: number
  }
  plans: SubscriptionPlanItem[]
}

export type CreateWechatNativeOrderRequest = {
  planCode: PaymentPlanCode
}

export type PaymentOrderResponseData = {
  orderNo: string
  planCode: PaymentPlanCode
  planName: string
  amountCents: number
  currency: "CNY"
  status: PaymentOrderStatus
  codeUrl: string | null
  expiresAt: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export type WechatNativeOrderResponseData = PaymentOrderResponseData

export type PaymentOrderSyncResponseData = PaymentOrderResponseData

export type AdminWechatPaymentSettingsResponseData = {
  enabled: boolean
  configured: boolean
  appId: string | null
  mchId: string | null
  notifyUrl: string | null
  merchantSerialNo: string | null
  merchantPrivateKeyMasked: string
  apiV3KeyMasked: string
  wechatpayPublicKeyId: string | null
  wechatpayPublicKeyMasked: string
  updatedAt: string | null
  updatedByAdminId: string | null
}

export type AdminUpdateWechatPaymentSettingsRequest = {
  enabled?: boolean
  appId?: string
  mchId?: string
  notifyUrl?: string
  merchantSerialNo?: string
  merchantPrivateKeyPem?: string
  apiV3Key?: string
  wechatpayPublicKeyId?: string
  wechatpayPublicKeyPem?: string
}

export type AdminSubscriptionPlanListResponseData = {
  items: SubscriptionPlanItem[]
}

export type AdminUpsertSubscriptionPlanRequest = {
  code?: string
  name?: string
  priceCents?: number
  currency?: "CNY"
  durationDays?: number
  tierRank?: number
  description?: string
  features?: string[]
  periodLabel?: string
  ctaLabel?: string
  highlight?: boolean
  purchasable?: boolean
  active?: boolean
  displayOrder?: number
}
