"use client"

import type { PaymentChannel, PaymentOrderStatus } from "@/lib/api/contracts/payment"
import { Badge } from "@/components/ui/badge"

export function formatMoney(cents: number) {
  return `¥${(cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "暂无"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

const orderStatusMeta: Record<PaymentOrderStatus, { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  created: { label: "待支付", variant: "warning" },
  prepay_created: { label: "待支付", variant: "warning" },
  paid: { label: "已支付", variant: "success" },
  closed: { label: "已关闭", variant: "neutral" },
  expired: { label: "已过期", variant: "neutral" },
  failed: { label: "失败", variant: "danger" },
}

export function OrderStatusBadge({ status }: { status: PaymentOrderStatus }) {
  const meta = orderStatusMeta[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function ChannelBadge({ channel }: { channel: PaymentChannel }) {
  return <Badge variant="outline">{channel === "alipay" ? "支付宝" : "微信"}</Badge>
}
