"use client"

import type { ReactNode } from "react"
import { CreditCard, Loader2, RefreshCw, Trash2, XCircle, Calendar, Clock, } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import type {
  PaymentOrderResponseData,
  PaymentOrderStatus,
} from "@/lib/api/contracts/payment"

type OrderListProps = {
  items: PaymentOrderResponseData[]
  total: number
  hasMore: boolean
  isMutating: boolean
  isLoadingMore: boolean
  emptyTitle: string
  emptyDescription: string
  emptyAction?: ReactNode
  onContinuePay: (order: PaymentOrderResponseData) => void
  onSync: (order: PaymentOrderResponseData) => void
  onCancel: (order: PaymentOrderResponseData) => void
  onDelete: (order: PaymentOrderResponseData) => void
  onLoadMore: () => void
}

const statusMeta: Record<PaymentOrderStatus, { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  created: { label: "待支付", variant: "warning" },
  prepay_created: { label: "待支付", variant: "warning" },
  paid: { label: "已支付", variant: "success" },
  closed: { label: "已取消", variant: "neutral" },
  expired: { label: "已过期", variant: "neutral" },
  failed: { label: "支付失败", variant: "danger" },
}

function formatAmount(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`
}

function formatDateTime(iso: string | null) {
  if (!iso) return "暂无"
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function canContinue(order: PaymentOrderResponseData) {
  return (order.status === "created" || order.status === "prepay_created")
    && new Date(order.expiresAt).getTime() > Date.now()
}

function canCancel(order: PaymentOrderResponseData) {
  return canContinue(order)
}

function canDelete(order: PaymentOrderResponseData) {
  return order.status === "closed" || order.status === "expired" || order.status === "failed"
}

const orderActionButtonClass = "min-h-10 min-w-0 w-full max-w-[33%] text-xs sm:text-sm"

export function OrderList({
  items,
  total,
  hasMore,
  isMutating,
  isLoadingMore,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onContinuePay,
  onSync,
  onCancel,
  onDelete,
  onLoadMore,
}: OrderListProps) {
  if (items.length === 0) {
    return (
      <StatePanel
        status="empty"
        title={emptyTitle}
        description={emptyDescription}
        extra={emptyAction}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>共 <span className="font-medium text-foreground">{total}</span> 条订单</span>
        <span>已展示 <span className="font-medium text-foreground">{items.length}</span> 条</span>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {items.map((order) => {
          const meta = statusMeta[order.status]
          return (
            <article
              key={order.orderNo}
              className="overflow-hidden rounded-[22px] border border-border/70 bg-surface-1/95 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.25)] sm:rounded-[24px]"
            >
              <div className="border-b border-border/50 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-base font-semibold leading-tight text-foreground sm:text-lg">{order.planName}</h2>
                    <p className="shrink-0 text-xl font-bold text-foreground sm:text-2xl">{formatAmount(order.amountCents)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <Badge variant="outline">{order.paymentChannel === "alipay" ? "支付宝" : "微信"}</Badge>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">订单号：{order.orderNo}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 px-4 py-4 text-sm text-muted-foreground sm:grid-cols-3 sm:px-5">
                <div className="rounded-2xl border border-border/60 bg-surface-2 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    创建时间
                  </div>
                  <p className="mt-1 font-medium text-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface-2 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    支付时间
                  </div>
                  <p className="mt-1 font-medium text-foreground">{formatDateTime(order.paidAt)}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-border/60 bg-surface-2 px-3 py-2 dark:border-white/10 dark:bg-white/5 sm:col-span-1">
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    支付有效期
                  </div>
                  <p className="mt-1 font-medium text-foreground">{formatDateTime(order.expiresAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 bg-muted/20 px-4 pt-3 pb-4 sm:px-5">
                {canContinue(order) ? (
                  <Button
                    type="button"
                    size="sm"
                    className={cn(orderActionButtonClass, USER_BUTTON_PRIMARY_CLASS)}
                    disabled={isMutating}
                    onClick={() => onContinuePay(order)}
                  >
                    <CreditCard className="h-4 w-4" />
                    继续支付
                  </Button>
                ) : null}
                {(order.status === "created" || order.status === "prepay_created") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(orderActionButtonClass, USER_PANEL_OUTLINE_BUTTON_CLASS)}
                    disabled={isMutating}
                    onClick={() => onSync(order)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    刷新状态
                  </Button>
                ) : null}
                {canCancel(order) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(orderActionButtonClass, USER_PANEL_OUTLINE_BUTTON_CLASS)}
                    disabled={isMutating}
                    onClick={() => onCancel(order)}
                  >
                    <XCircle className="h-4 w-4" />
                    取消订单
                  </Button>
                ) : null}
                {canDelete(order) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructiveSoft"
                    className={orderActionButtonClass}
                    disabled={isMutating}
                    onClick={() => onDelete(order)}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除记录
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className={cn("min-w-[200px]", USER_PANEL_OUTLINE_BUTTON_CLASS)}
          >
            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoadingMore ? "加载中..." : "加载更多"}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground/60">已加载全部 {total} 条订单</p>
      )}
    </div>
  )
}
