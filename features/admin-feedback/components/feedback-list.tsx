"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { feedbackTypeLabels, feedbackPriorityLabels } from "../data/status-config"
import type { AdminFeedbackListResponseData } from "@/lib/api/contracts/feedback"
import { StatePanel } from "@/components/ui/state-panel"

export function FeedbackList() {
  const [data, setData] = useState<AdminFeedbackListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [keyword, setKeyword] = useState("")

  useEffect(() => {
    async function fetchFeedbackList() {
      try {
        const params = new URLSearchParams()
        if (statusFilter !== "all") {
          params.append("status", statusFilter)
        }
        if (keyword) {
          params.append("keyword", keyword)
        }
        const response = await fetch(`/api/admin/feedback?${params.toString()}`, {
          cache: "no-store",
        })
        const result = await response.json()

        if (result.code !== "OK") {
          throw new Error(result.message || "获取反馈列表失败")
        }

        setData(result.data as AdminFeedbackListResponseData)
      } catch (error) {
        setError(error instanceof Error ? error.message : "网络请求失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedbackList()
  }, [statusFilter, keyword])

  if (error) {
    return <StatePanel status="error" title="获取数据失败" description={error} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">反馈工单</h1>
          <p className="text-sm text-muted-foreground mt-1">
            处理用户反馈与问题
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-md bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">全部状态</option>
          <option value="submitted">待处理</option>
          <option value="in_review">处理中</option>
          <option value="replied">已回复</option>
          <option value="closed">已关闭</option>
        </select>
        <input
          type="search"
          placeholder="搜索工单号、标题、用户..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-9 px-3 text-sm rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-64"
        />
      </div>

      {/* 工单列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 bg-card border border-border rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">工单号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    #{item.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/feedback/${item.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {feedbackTypeLabels[item.feedbackType]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.priority === "high"
                          ? "bg-destructive/20 text-destructive"
                          : item.priority === "medium"
                            ? "bg-chart-2/20 text-chart-2"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {feedbackPriorityLabels[item.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === "submitted"
                          ? "bg-chart-2/20 text-chart-2"
                          : item.status === "in_review"
                            ? "bg-chart-3/20 text-chart-3"
                            : item.status === "replied"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.userNicknameSnapshot || "未知用户"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(item.submittedAt).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <StatePanel status="empty" title="暂无反馈工单" description="目前没有反馈工单" />
      )}
    </div>
  )
}
