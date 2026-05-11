"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type { AdminFinanceOrderDetailResponseData } from "@/lib/api/contracts/payment"
import { ChannelBadge, formatDateTime, formatMoney, OrderStatusBadge } from "./finance-shared"

export function AdminFinanceOrderDetailPage({ orderNo }: { orderNo: string }) {
  const toast = useAppToast()
  const [data, setData] = useState<AdminFinanceOrderDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  useEffect(() => {
    async function load() {
      try {
        const result = await adminRequestData<AdminFinanceOrderDetailResponseData>(
          `/admin/finance/orders/${orderNo}`,
          { method: "GET" },
          "获取订单详情失败",
        )
        setData(result)
      } catch (err) {
        setAuthExpired(isAdminSessionExpiredError(err))
        setError(getAdminApiErrorMessage(err, "网络请求失败"))
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [orderNo])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await adminRequestData<AdminFinanceOrderDetailResponseData>(
        `/admin/finance/orders/${orderNo}/sync`,
        { method: "POST" },
        "同步订单失败",
      )
      setData(result)
      toast.success("订单状态已同步")
    } catch (err) {
      setAuthExpired(isAdminSessionExpiredError(err))
      toast.error(getAdminApiErrorMessage(err, "同步订单失败"))
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) return <StatePanel status="loading" title="正在读取订单详情" />
  if (error || !data) return <StatePanel status="error" title="订单详情读取失败" description={error ?? "订单不存在"} />

  const order = data.order

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/admin/finance/orders"><ArrowLeft className="h-4 w-4" />返回订单列表</Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">订单详情</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{order.orderNo}</p>
        </div>
        <Button type="button" variant="outline" onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className="h-4 w-4" />
          {isSyncing ? "同步中..." : "同步订单状态"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{order.planName}</h2>
            <OrderStatusBadge status={order.status} />
            <ChannelBadge channel={order.paymentChannel} />
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-muted-foreground">订单金额</dt><dd className="mt-1 text-2xl font-semibold">{formatMoney(order.amountCents)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Provider 交易号</dt><dd className="mt-1 break-all text-sm">{order.providerTradeNo ?? "暂无"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">用户</dt><dd className="mt-1 text-sm">{order.userNickname ?? "未命名用户"} · {order.userEmail ?? order.userId}</dd></div>
            <div><dt className="text-sm text-muted-foreground">套餐编码</dt><dd className="mt-1 text-sm">{order.planCode}</dd></div>
            <div><dt className="text-sm text-muted-foreground">创建时间</dt><dd className="mt-1 text-sm">{formatDateTime(order.createdAt)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">支付时间</dt><dd className="mt-1 text-sm">{formatDateTime(order.paidAt)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">过期时间</dt><dd className="mt-1 text-sm">{formatDateTime(order.expiresAt)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">取消时间</dt><dd className="mt-1 text-sm">{formatDateTime(order.cancelledAt)}</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">状态时间线</h2>
          <div className="mt-4 space-y-3">
            {data.timeline.map((item) => (
              <div key={`${item.label}-${item.at}`} className="border-l-2 border-primary/30 pl-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">支付载荷摘要</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
            {JSON.stringify(order.prepayPayload, null, 2)}
          </pre>
          <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
            {JSON.stringify(order.callbackPayload, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  )
}
