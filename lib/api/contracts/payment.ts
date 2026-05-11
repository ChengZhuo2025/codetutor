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
export type PaymentChannel = "wechat" | "alipay"

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

export type CreateAlipayPrecreateOrderRequest = {
  planCode: PaymentPlanCode
}

export type PaymentOrderResponseData = {
  orderNo: string
  planCode: PaymentPlanCode
  planName: string
  amountCents: number
  currency: "CNY"
  status: PaymentOrderStatus
  paymentChannel: PaymentChannel
  codeUrl: string | null
  expiresAt: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentOrderListSummary = {
  totalCount: number
  pendingCount: number
  paidCount: number
  closedCount: number
  expiredCount: number
  failedCount: number
}

export type PaymentOrderListResponseData = {
  items: PaymentOrderResponseData[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  summary: PaymentOrderListSummary
}

export type WechatNativeOrderResponseData = PaymentOrderResponseData
export type AlipayPrecreateOrderResponseData = PaymentOrderResponseData

export type PaymentOrderSyncResponseData = PaymentOrderResponseData

export type AdminFinanceOrderListItem = {
  orderNo: string
  userId: string
  userNickname: string | null
  userPhone: string | null
  planCode: PaymentPlanCode
  planName: string
  amountCents: number
  currency: "CNY"
  status: PaymentOrderStatus
  paymentChannel: PaymentChannel
  providerTradeNo: string | null
  paidAt: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type AdminFinanceOrderListResponseData = {
  items: AdminFinanceOrderListItem[]
  total: number
  page: number
  limit: number
  stats: {
    totalOrders: number
    paidOrders: number
    pendingOrders: number
    revenueCents: number
  }
}

export type AdminFinanceOrderDetailResponseData = {
  order: AdminFinanceOrderListItem & {
    codeUrl: string | null
    userDeletedAt: string | null
    cancelledAt: string | null
    cancelReason: string | null
    wechatTransactionId: string | null
    alipayTradeNo: string | null
    prepayPayload: Record<string, unknown>
    callbackPayload: Record<string, unknown>
  }
  timeline: Array<{
    label: string
    at: string
    status: PaymentOrderStatus | "created"
  }>
}

export type AdminFinanceStatsResponseData = {
  range: {
    dateFrom: string
    dateTo: string
  }
  overview: {
    revenueCents: number
    paidOrders: number
    pendingOrders: number
    closedOrders: number
    expiredOrders: number
    failedOrders: number
    averageOrderValueCents: number
  }
  channelBreakdown: Array<{
    channel: PaymentChannel
    revenueCents: number
    paidOrders: number
  }>
  planBreakdown: Array<{
    planCode: PaymentPlanCode
    planName: string
    revenueCents: number
    paidOrders: number
  }>
  dailyTrend: Array<{
    date: string
    revenueCents: number
    paidOrders: number
  }>
}

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

export type AdminAlipayPaymentSettingsResponseData = {
  enabled: boolean
  configured: boolean
  appId: string | null
  notifyUrl: string | null
  signType: "RSA2"
  appPrivateKeyMasked: string
  alipayPublicKeyMasked: string
  updatedAt: string | null
  updatedByAdminId: string | null
}

export type AdminUpdateAlipayPaymentSettingsRequest = {
  enabled?: boolean
  appId?: string
  notifyUrl?: string
  appPrivateKeyPem?: string
  alipayPublicKeyPem?: string
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
