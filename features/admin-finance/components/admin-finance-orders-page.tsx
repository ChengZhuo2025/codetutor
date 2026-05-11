"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type { AdminFinanceOrderListResponseData } from "@/lib/api/contracts/payment"
import { ChannelBadge, formatDateTime, formatMoney, OrderStatusBadge } from "./finance-shared"

export function AdminFinanceOrdersPage() {
  const [data, setData] = useState<AdminFinanceOrderListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [status, setStatus] = useState("all")
  const [channel, setChannel] = useState("all")
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [limit, setLimit] = useState("20")
  const [page, setPage] = useState(1)

  useAdminSessionExpiryRedirect(authExpired)

  const total = data?.total ?? 0
  const pageSize = Number(limit) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit, status, channel })
      if (keywordApplied) params.set("keyword", keywordApplied)
      const result = await adminRequestData<AdminFinanceOrderListResponseData>(
        `/admin/finance/orders?${params.toString()}`,
        { method: "GET" },
        "获取财务订单失败",
      )
      setData(result)
    } catch (err) {
      setAuthExpired(isAdminSessionExpiredError(err))
      setError(getAdminApiErrorMessage(err, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [channel, keywordApplied, limit, page, status])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  if (error) return <StatePanel status="error" title="获取财务订单失败" description={error} />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">订单列表</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">查看用户订阅订单、支付状态和渠道流水。</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void fetchList()} disabled={isLoading}>
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">订单总数</p>
          <p className="mt-1 text-2xl font-semibold">{data?.stats.totalOrders ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">成交订单</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-green-400">{data?.stats.paidOrders ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">待支付</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">{data?.stats.pendingOrders ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">成交金额</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(data?.stats.revenueCents ?? 0)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1)
                setKeywordApplied(keyword.trim())
              }
            }} placeholder="搜索订单号或套餐名" className="pl-9" />
          </div>
          <AdminSelect value={status} onValueChange={(value) => { setPage(1); setStatus(value) }} options={[
            { value: "all", label: "全部状态" },
            { value: "prepay_created", label: "待支付" },
            { value: "paid", label: "已支付" },
            { value: "closed", label: "已关闭" },
            { value: "expired", label: "已过期" },
            { value: "failed", label: "失败" },
          ]} />
          <AdminSelect value={channel} onValueChange={(value) => { setPage(1); setChannel(value) }} options={[
            { value: "all", label: "全部渠道" },
            { value: "alipay", label: "支付宝" },
            { value: "wechat", label: "微信" },
          ]} />
          <Button type="button" onClick={() => { setPage(1); setKeywordApplied(keyword.trim()) }}>搜索</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">订单</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">渠道</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">加载中...</td></tr>
              ) : (data?.items.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">暂无订单</td></tr>
              ) : data?.items.map((item) => (
                <tr key={item.orderNo}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{item.planName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.orderNo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{item.userNickname ?? "未命名用户"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.userEmail ?? item.userId}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(item.amountCents)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3"><ChannelBadge channel={item.paymentChannel} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={`/admin/finance/orders/${item.orderNo}`}>详情</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminListPaginationFooter
          limit={limit}
          onLimitChange={(value) => { setLimit(value); setPage(1) }}
          page={page}
          totalPages={totalPages}
          total={total}
          canPrev={page > 1}
          canNext={page < totalPages}
          isLoading={isLoading}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
        />
      </div>
    </div>
  )
}
