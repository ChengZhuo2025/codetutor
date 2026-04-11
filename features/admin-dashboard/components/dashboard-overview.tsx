"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import type { AdminDashboardMetric, AdminDashboardOverviewResponseData } from "@/lib/api/contracts/admin"
import { ADMIN_ROUTES } from "@/constants/routes"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"
import { AdminAreaChart } from "./charts/admin-area-chart"
import { AdminBarChart } from "./charts/admin-bar-chart"
import {
  DASHBOARD_STAT_CARDS,
  FEEDBACK_PRIORITY_BADGE_CLASS,
  FEEDBACK_STATUS_BADGE_CLASS,
  type DashboardStatCardDef,
} from "../data/dashboard-config"

function TrendGlyph({ trend }: { trend: AdminDashboardMetric["trend"] }) {
  if (trend === "up") {
    return <TrendingUp className="size-3.5" aria-hidden />
  }
  if (trend === "down") {
    return <TrendingDown className="size-3.5" aria-hidden />
  }
  return <Minus className="size-3.5" aria-hidden />
}

function formatMetricDisplay(def: DashboardStatCardDef, metric: AdminDashboardMetric | null): string {
  if (!metric) {
    return "—"
  }
  if (def.format === "int") {
    return metric.value.toLocaleString()
  }
  if (def.format === "percent1") {
    return `${metric.value.toFixed(1)}%`
  }
  return `${Math.round(metric.value).toLocaleString()}ms`
}

function trendTextClass(trend: AdminDashboardMetric["trend"]) {
  if (trend === "up") {
    return "text-green-400"
  }
  if (trend === "down") {
    return "text-red-400"
  }
  return "text-muted-foreground"
}

export function DashboardOverview() {
  const [data, setData] = useState<AdminDashboardOverviewResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [currentTime, setCurrentTime] = useState("")

  useAdminSessionExpiryRedirect(authExpired)

  useEffect(() => {
    const update = () =>
      setCurrentTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function fetchOverview() {
      try {
        const result = await adminRequestData<AdminDashboardOverviewResponseData>(
          "/admin/dashboard/overview",
          {
            method: "GET",
          },
          "获取看板数据失败",
        )
        setData(result)
      } catch (err) {
        setAuthExpired(isAdminSessionExpiredError(err))
        setError(getAdminApiErrorMessage(err, "网络请求失败"))
      } finally {
        setIsLoading(false)
      }
    }

    void fetchOverview()
  }, [])

  const visibleCards = useMemo(() => {
    if (!data) {
      return DASHBOARD_STAT_CARDS.filter((c) => !c.requiresAi)
    }
    return DASHBOARD_STAT_CARDS.filter((c) => !c.requiresAi || data.canViewAiCharts)
  }, [data])

  if (error) {
    return <StatePanel status="error" title="获取数据失败" description={error} />
  }

  const chartHourly = data?.aiHourlySuccess?.length
    ? data.aiHourlySuccess
    : Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, "0")}:00`,
        successRate: 0,
      }))

  const chartWeekly = data?.weeklyActiveByDay?.length
    ? data.weeklyActiveByDay
    : [
        { day: "周一", activeUsers: 0 },
        { day: "周二", activeUsers: 0 },
        { day: "周三", activeUsers: 0 },
        { day: "周四", activeUsers: 0 },
        { day: "周五", activeUsers: 0 },
        { day: "周六", activeUsers: 0 },
        { day: "周日", activeUsers: 0 },
      ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">运营面板</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            今日数据
            {currentTime ? ` · 最后更新：${currentTime}` : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="size-1.5 animate-pulse rounded-full bg-green-400" />
            系统正常
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.map((def) => {
          const Icon = def.icon
          const metric = data?.metrics[def.metricKey] ?? null
          const comparisonSuffix =
            def.requiresAi && (def.metricKey === "aiSuccessRate24h" || def.metricKey === "aiAvgLatencyMs24h")
              ? "较前 24h"
              : "较昨日"

          return (
            <Link
              key={def.metricKey}
              href={def.href}
              className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className={cn("flex size-8 items-center justify-center rounded-md", def.iconBgClass)}>
                  <Icon className={cn("size-4", def.iconColorClass)} aria-hidden />
                </div>
                <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {isLoading ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  formatMetricDisplay(def, metric)
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{def.label}</p>
              <div
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs",
                  metric ? trendTextClass(metric.trend) : "text-muted-foreground",
                )}
              >
                {isLoading ? (
                  <span className="inline-block h-3 w-20 animate-pulse rounded bg-muted" />
                ) : (
                  <>
                    {metric ? <TrendGlyph trend={metric.trend} /> : null}
                    <span>
                      {metric?.comparisonLabel
                        ? `${metric.comparisonLabel} ${comparisonSuffix}`
                        : "暂无对比"}
                    </span>
                  </>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <div
        className={cn(
          "grid gap-4",
          data?.canViewAiCharts ? "lg:grid-cols-5" : "grid-cols-1",
        )}
      >
        {data?.canViewAiCharts ? (
          <div className="rounded-lg border border-border bg-card p-4 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">AI 调用趋势（近 24h）</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">成功率 · 按小时统计</p>
              </div>
              <Link href={`${ADMIN_ROUTES.ai}/invocations`} className="text-xs text-primary hover:underline">
                查看详情
              </Link>
            </div>
            <div className="h-44">
              {isLoading ? (
                <div className="h-full animate-pulse rounded-md bg-muted/40" />
              ) : (
                <AdminAreaChart
                  data={chartHourly}
                  xKey="time"
                  yKey="successRate"
                  yDomain={[0, 100]}
                  name="成功率 %"
                  ariaLabel="近 24 小时 AI 调用成功率面积图"
                />
              )}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-lg border border-border bg-card p-4",
            data?.canViewAiCharts ? "lg:col-span-2" : "lg:col-span-full",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">用户活跃（本周）</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data?.weeklyActiveSubtitle ?? "日活跃用户数"}
              </p>
            </div>
            <Link href={ADMIN_ROUTES.users} className="text-xs text-primary hover:underline">
              查看详情
            </Link>
          </div>
          <div className="h-44">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-md bg-muted/40" />
            ) : (
              <AdminBarChart
                data={chartWeekly}
                xKey="day"
                yKey="activeUsers"
                name="活跃用户"
                ariaLabel="本周按日统计的去重活跃用户数"
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          data?.canViewAiCharts ? "lg:grid-cols-5" : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-card",
            data?.canViewAiCharts ? "lg:col-span-3" : "lg:col-span-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">最新反馈工单</h3>
            <Link href={ADMIN_ROUTES.feedback} className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                  </div>
                ))
              : (data?.recentFeedback ?? []).map((fb) => (
                  <Link
                    key={fb.id}
                    href={`${ADMIN_ROUTES.feedback}/${fb.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {fb.id.slice(0, 8)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{fb.userLabel}</span>
                    <span className="hidden w-20 text-xs text-muted-foreground sm:block">{fb.typeLabel}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        FEEDBACK_STATUS_BADGE_CLASS[fb.statusLabel] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {fb.statusLabel}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px]",
                        FEEDBACK_PRIORITY_BADGE_CLASS[fb.priority] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {fb.priority === "high" ? "高" : fb.priority === "medium" ? "中" : "低"}
                    </span>
                    <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                      {fb.relativeTime}
                    </span>
                  </Link>
                ))}
            {!isLoading && (data?.recentFeedback?.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">暂无工单</p>
            ) : null}
          </div>
        </div>

        {data?.canViewAiCharts ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground">AI 健康状态</h3>
              <Link href={ADMIN_ROUTES.ai} className="text-xs text-primary hover:underline">
                查看详情
              </Link>
            </div>
            <div className="space-y-3 p-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
                  ))
                : (data?.aiHealth ?? []).map((alert, i) => (
                    <div
                      key={`${alert.modelCode}-${i}`}
                      className={cn(
                        "flex items-start gap-3 rounded-md border p-3",
                        alert.severity === "warning"
                          ? "border-yellow-400/20 bg-yellow-400/5"
                          : "border-green-400/20 bg-green-400/5",
                      )}
                    >
                      <AlertCircle
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          alert.severity === "warning" ? "text-yellow-400" : "text-green-400",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{alert.modelCode}</p>
                        <p className="text-[10px] text-muted-foreground">{alert.providerCode}</p>
                        <p
                          className={cn(
                            "mt-0.5 text-[10px]",
                            alert.severity === "warning" ? "text-yellow-400" : "text-green-400",
                          )}
                        >
                          {alert.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{alert.relativeTime}</span>
                    </div>
                  ))}
              {!isLoading && (data?.aiHealth?.length ?? 0) === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">近 24h 样本不足或无告警</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
