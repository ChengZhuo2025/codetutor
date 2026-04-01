"use client"

import { useEffect, useState } from "react"
import type { AdminFeedbackTicketDetailResponseData } from "@/lib/api/contracts/feedback"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { ADMIN_ROUTES } from "@/constants/routes"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface FeedbackDetailProps {
  ticketId: string
}

export function FeedbackDetail({ ticketId }: FeedbackDetailProps) {
  const [data, setData] = useState<AdminFeedbackTicketDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`/api/admin/feedback/${ticketId}`, {
          cache: "no-store",
        })
        const result = await response.json()

        if (result.code !== "OK") {
          throw new Error(result.message || "获取工单详情失败")
        }

        setData(result.data as AdminFeedbackTicketDetailResponseData)
        setNewStatus(result.data.status)
      } catch (error) {
        setError(error instanceof Error ? error.message : "网络请求失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetail()
  }, [ticketId])

  const handleReply = async () => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/feedback/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          status: newStatus,
        }),
      })
      const result = await response.json()
      if (result.code === "OK") {
        setData(result.data)
        setReplyContent("")
      } else {
        setError(result.message || "回复失败")
      }
    } catch {
      setError("网络请求失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/feedback/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (result.code === "OK") {
        setData(result.data)
        setNewStatus(status)
      } else {
        setError(result.message || "状态更新失败")
      }
    } catch {
      setError("网络请求失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={ADMIN_ROUTES.feedback} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <StatePanel status="error" title="获取数据失败" description={error} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Link href={ADMIN_ROUTES.feedback} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-card border border-border rounded-lg" />
          <div className="h-48 bg-card border border-border rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href={ADMIN_ROUTES.feedback} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      {/* 工单信息 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{data.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              工单号: #{data.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={newStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isSubmitting}
              className="h-8 px-3 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="submitted">待处理</option>
              <option value="in_review">处理中</option>
              <option value="replied">已回复</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>类型: {data.feedbackTypeLabel}</span>
          <span>优先级: {data.priority === "high" ? "高" : data.priority === "medium" ? "中" : "低"}</span>
          <span>创建时间: {new Date(data.submittedAt).toLocaleString("zh-CN")}</span>
        </div>
      </div>

      {/* 对话历史 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">对话记录</h3>
        <div className="space-y-4">
          {data.replies.map((reply) => (
            <div
              key={reply.id}
              className={`flex ${reply.authorType === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  reply.authorType === "user"
                    ? "bg-muted text-foreground"
                    : "bg-primary/20 text-foreground"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {reply.authorType === "user" ? "用户" : "管理员"}
                </p>
                <p className="text-sm">{reply.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(reply.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 回复输入 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-foreground mb-3">回复工单</h3>
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="请输入回复内容..."
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="h-8 px-3 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="submitted">待处理</option>
            <option value="in_review">处理中</option>
            <option value="replied">已回复</option>
            <option value="closed">已关闭</option>
          </select>
          <Button
            onClick={handleReply}
            disabled={isSubmitting || !replyContent.trim()}
            type="button"
          >
            {isSubmitting ? "发送中..." : "发送回复"}
          </Button>
        </div>
      </div>
    </div>
  )
}
