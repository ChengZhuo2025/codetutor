"use client"

import { useEffect, useState } from "react"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type { AdminFinanceStatsResponseData } from "@/lib/api/contracts/payment"
import { formatMoney } from "./finance-shared"

export function AdminFinanceStatsPage() {
  const [data, setData] = useState<AdminFinanceStatsResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  useEffect(() => {
    async function load() {
      try {
        const result = await adminRequestData<AdminFinanceStatsResponseData>(
          "/admin/finance/stats",
          { method: "GET" },
          "获取财务统计失败",
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
  }, [])

  if (isLoading) return <StatePanel status="loading" title="正在加载财务统计" />
  if (error || !data) return <StatePanel status="error" title="财务统计加载失败" description={error ?? "暂无数据"} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">财务统计</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {data.range.dateFrom} 至 {data.range.dateTo} 的支付收入和订单结构。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">成交金额</p><p className="mt-1 text-2xl font-semibold">{formatMoney(data.overview.revenueCents)}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">支付订单</p><p className="mt-1 text-2xl font-semibold">{data.overview.paidOrders}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">待支付</p><p className="mt-1 text-2xl font-semibold">{data.overview.pendingOrders}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">客单价</p><p className="mt-1 text-2xl font-semibold">{formatMoney(data.overview.averageOrderValueCents)}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">支付渠道</h2>
          <div className="mt-4 space-y-3">
            {data.channelBreakdown.map((item) => (
              <div key={item.channel} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <span>{item.channel === "alipay" ? "支付宝" : "微信"}</span>
                <span className="font-medium">{formatMoney(item.revenueCents)} · {item.paidOrders} 单</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">套餐收入</h2>
          <div className="mt-4 space-y-3">
            {data.planBreakdown.map((item) => (
              <div key={item.planCode} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <span>{item.planName}</span>
                <span className="font-medium">{formatMoney(item.revenueCents)} · {item.paidOrders} 单</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">每日成交趋势</h2>
        <div className="mt-4 grid gap-2">
          {data.dailyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">当前周期暂无成交订单。</p>
          ) : data.dailyTrend.map((item) => (
            <div key={item.date} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{item.date}</span>
              <span className="h-2 rounded-full bg-primary/15">
                <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(8, item.revenueCents / Math.max(1, data.overview.revenueCents) * 100))}%` }} />
              </span>
              <span className="font-medium">{formatMoney(item.revenueCents)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
