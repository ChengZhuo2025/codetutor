"use client"

import { useEffect, useState } from "react"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { AdminAreaChart } from "@/features/admin-dashboard/components/charts/admin-area-chart"
import { AdminBarChart } from "@/features/admin-dashboard/components/charts/admin-bar-chart"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type { AdminFinanceStatsResponseData } from "@/lib/api/contracts/payment"
import { formatMoney } from "./finance-shared"

function EmptyChartState({ text }: { text: string }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

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

  const channelChartData = data.channelBreakdown.map((item) => ({
    channel: item.channel === "alipay" ? "支付宝" : "微信",
    revenue: item.revenueCents / 100,
    orders: item.paidOrders,
  }))
  const planChartData = data.planBreakdown.map((item) => ({
    plan: item.planName,
    revenue: item.revenueCents / 100,
    orders: item.paidOrders,
  }))
  const dailyChartData = data.dailyTrend.map((item) => ({
    date: item.date.slice(5),
    revenue: item.revenueCents / 100,
    orders: item.paidOrders,
  }))

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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">支付渠道</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">成交金额 · 按渠道统计</p>
            </div>
          </div>
          <div className="h-44">
            {channelChartData.length > 0 ? (
              <AdminBarChart
                data={channelChartData}
                xKey="channel"
                yKey="revenue"
                name="成交金额"
                ariaLabel="支付渠道成交金额柱状图"
              />
            ) : (
              <EmptyChartState text="暂无渠道成交数据" />
            )}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">套餐收入</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">成交金额 · 按套餐统计</p>
            </div>
          </div>
          <div className="h-44">
            {planChartData.length > 0 ? (
              <AdminBarChart
                data={planChartData}
                xKey="plan"
                yKey="revenue"
                name="成交金额"
                ariaLabel="套餐收入柱状图"
              />
            ) : (
              <EmptyChartState text="暂无套餐成交数据" />
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">每日成交趋势</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">成交金额 · 按天统计</p>
        </div>
        <div className="h-52">
          {dailyChartData.length > 0 ? (
            <AdminAreaChart
              data={dailyChartData}
              xKey="date"
              yKey="revenue"
              name="成交金额"
              ariaLabel="每日成交金额趋势图"
            />
          ) : (
            <EmptyChartState text="当前周期暂无成交订单" />
          )}
        </div>
      </section>
    </div>
  )
}
