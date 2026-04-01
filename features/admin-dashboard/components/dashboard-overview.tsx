"use client"

import { useEffect, useState } from "react"
import type { AdminDashboardOverviewResponseData } from "@/lib/api/contracts/admin"
import { LayoutDashboard, Users, CheckSquare, BookOpen, Calendar } from "lucide-react"
import { StatePanel } from "@/components/ui/state-panel"

interface MetricCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  isLoading?: boolean
}

function MetricCard({ title, value, icon: Icon, trend, isLoading }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-semibold text-foreground">
            {isLoading ? "-" : value.toLocaleString()}
          </p>
          {trend && (
            <p className="text-[10px] text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const [data, setData] = useState<AdminDashboardOverviewResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOverview() {
      try {
        const response = await fetch("/api/admin/dashboard/overview", {
          cache: "no-store",
        })
        const result = await response.json()

        if (result.code !== "OK") {
          throw new Error(result.message || "获取看板数据失败")
        }

        setData(result.data as AdminDashboardOverviewResponseData)
      } catch (error) {
        setError(error instanceof Error ? error.message : "网络请求失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverview()
  }, [])

  if (error) {
    return <StatePanel status="error" title="获取数据失败" description={error} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">总览看板</h1>
        <p className="text-sm text-muted-foreground mt-1">系统核心数据指标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="待处理反馈"
          value={data?.pendingFeedbackCount ?? 0}
          icon={LayoutDashboard}
          isLoading={isLoading}
        />
        <MetricCard
          title="今日新增用户"
          value={data?.todayNewUserCount ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <MetricCard
          title="今日完成任务"
          value={data?.todayCompletedTaskCount ?? 0}
          icon={CheckSquare}
          isLoading={isLoading}
        />
        <MetricCard
          title="活跃学习计划"
          value={data?.activeLearningPathCount ?? 0}
          icon={BookOpen}
          isLoading={isLoading}
        />
        <MetricCard
          title="今日打卡人数"
          value={data?.todayCheckinCount ?? 0}
          icon={Calendar}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
