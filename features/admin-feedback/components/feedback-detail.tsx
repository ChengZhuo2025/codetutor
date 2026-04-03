"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Flame,
  Loader2,
  Send,
  Star,
  Trash2,
  Trophy,
} from "lucide-react"
import type { AdminFeedbackTicketDetailResponseData, FeedbackStatus } from "@/lib/api/contracts/feedback"
import { FEEDBACK_SOURCES } from "@/lib/api/contracts/feedback"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { ADMIN_ROUTES } from "@/constants/routes"
import { feedbackPriorityLabels } from "../data/status-config"
import { cn } from "@/lib/utils"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

interface FeedbackDetailProps {
  ticketId: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function maskEmail(email: string | null) {
  if (!email || !email.includes("@")) {
    return "—"
  }
  const [local, domain] = email.split("@")
  if (!domain) {
    return email
  }
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  return `${local.slice(0, 2)}***@${domain}`
}

function shortUserId(id: string) {
  return `user_${id.replace(/-/g, "").slice(0, 8)}`
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

const SOURCE_LABEL: Record<(typeof FEEDBACK_SOURCES)[number], string> = {
  settings_popover: "设置",
  history_sidebar: "历史侧栏",
}

export function FeedbackDetail({ ticketId }: FeedbackDetailProps) {
  const router = useRouter()
  const [data, setData] = useState<AdminFeedbackTicketDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminFeedbackTicketDetailResponseData>(
        `/admin/feedback/${ticketId}`,
        {
          method: "GET",
        },
        "获取工单详情失败",
      )

      setData(result)
      setNewStatus(result.status)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const handleReply = async () => {
    if (!replyContent.trim()) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminFeedbackTicketDetailResponseData>(
        `/admin/feedback/${ticketId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            content: replyContent,
            status: newStatus as FeedbackStatus,
          }),
        },
        "回复失败",
      )

      setData(result)
      setReplyContent("")
      setNewStatus(result.status)
    } catch (submitError) {
      setAuthExpired(isAdminSessionExpiredError(submitError))
      setError(getAdminApiErrorMessage(submitError, "网络请求失败"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminFeedbackTicketDetailResponseData>(
        `/admin/feedback/${ticketId}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        },
        "状态更新失败",
      )

      setData(result)
      setNewStatus(status)
    } catch (submitError) {
      setAuthExpired(isAdminSessionExpiredError(submitError))
      setError(getAdminApiErrorMessage(submitError, "网络请求失败"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickStatus = async (status: FeedbackStatus) => {
    if (data?.status === status) {
      return
    }
    await handleStatusChange(status)
  }

  const handleDelete = async () => {
    if (!window.confirm("确定删除该工单？删除后不可恢复。")) {
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await adminRequestData<{ deleted: boolean }>(
        `/admin/feedback/${ticketId}`,
        {
          method: "DELETE",
        },
        "删除失败",
      )
      router.push(ADMIN_ROUTES.feedback)
      router.refresh()
      return
    } catch (deleteError) {
      setAuthExpired(isAdminSessionExpiredError(deleteError))
      setError(getAdminApiErrorMessage(deleteError, "网络请求失败"))
    } finally {
      setIsDeleting(false)
    }
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          href={ADMIN_ROUTES.feedback}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <StatePanel status="error" title="获取数据失败" description={error} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Link
          href={ADMIN_ROUTES.feedback}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg border border-border bg-card" />
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="h-96 rounded-lg border border-border bg-card" />
            <div className="h-96 rounded-lg border border-border bg-card" />
          </div>
        </div>
      </div>
    )
  }

  const snap = data.userSnapshot
  const sourceLabel =
    data.source && (FEEDBACK_SOURCES as readonly string[]).includes(data.source)
      ? SOURCE_LABEL[data.source as (typeof FEEDBACK_SOURCES)[number]]
      : data.source
  const resolutionReplies = data.replies.filter((reply) => reply.authorType !== "user")
  const statusActions: Array<{ value: FeedbackStatus; label: string }> = [
    { value: "submitted", label: "待处理" },
    { value: "in_review", label: "处理中" },
    { value: "replied", label: "已解决" },
    { value: "closed", label: "已关闭" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={ADMIN_ROUTES.feedback}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {statusActions.map((action) => (
            <Button
              key={action.value}
              type="button"
              variant={data.status === action.value ? "default" : "outline"}
              size="sm"
              disabled={isSubmitting || data.status === action.value}
              onClick={() => void handleQuickStatus(action.value)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:border-destructive/40 hover:bg-destructive/12 hover:text-destructive"
            disabled={isDeleting || isSubmitting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            删除工单
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        {/* 主栏 */}
        <div className="min-w-0 space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-chart-2/20 px-2.5 py-0.5 text-sm font-medium text-chart-2">
                    {data.statusLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-sm font-medium",
                      data.priority === "high"
                        ? "bg-destructive/15 text-destructive"
                        : data.priority === "medium"
                          ? "bg-chart-2/20 text-chart-2"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {data.priority === "high"
                      ? "高优先级"
                      : data.priority === "medium"
                        ? "中优先级"
                        : "低优先级"}
                  </span>
                </div>
                <h1 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {data.title}
                </h1>
                <p className="font-mono text-xs text-muted-foreground break-all" title={data.id}>
                  工单号 {data.id}
                </p>
              </div>
            </div>
          </div>

          {/* 原始反馈 */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex gap-3 border-b border-border/80 pb-4">
              {snap.avatarUrl ? (
                <Image
                  src={snap.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {(snap.nickname || data.userNicknameSnapshot || "?").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">
                    {snap.nickname || data.userNicknameSnapshot || "用户"}
                  </span>
                  <span className="text-sm text-muted-foreground">{shortUserId(data.userId)}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDateTime(data.submittedAt)}
                </p>
              </div>
            </div>
            <div className="pt-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {sourceLabel ? (
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                    {sourceLabel}
                  </span>
                ) : null}
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  {data.feedbackTypeLabel}
                </span>
              </div>
            </div>
          </div>

          {resolutionReplies.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <Send className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">处理记录</h2>
              </div>
              <div className="space-y-3">
                {resolutionReplies.map((reply, index) => (
                  <div
                    key={reply.id}
                    className="rounded-md border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {reply.authorType === "admin" ? "管理员回复" : "系统处理"}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          记录 {index + 1}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 回复区 */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <Send className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">回复用户</h2>
            </div>

            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="输入回复内容…"
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">回复后状态</span>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="submitted">待处理</option>
                  <option value="in_review">处理中</option>
                  <option value="replied">已解决</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
              <Button
                type="button"
                onClick={() => void handleReply()}
                disabled={isSubmitting || !replyContent.trim()}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    发送中…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    发送
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 侧栏 */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">工单信息</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">类型</dt>
                <dd className="text-right text-foreground">{data.feedbackTypeLabel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">优先级</dt>
                <dd className="text-right font-medium text-foreground">
                  {feedbackPriorityLabels[data.priority]}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">状态</dt>
                <dd className="text-right text-foreground">{data.statusLabel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">创建时间</dt>
                <dd className="text-right text-sm text-foreground">{formatDateTime(data.submittedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">最后回复</dt>
                <dd className="text-right text-sm text-foreground">
                  {data.lastReplyAt ? formatDateTime(data.lastReplyAt) : "—"}
                </dd>
              </div>
              {data.contactMethod ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">联系方式</dt>
                  <dd className="max-w-[60%] break-all text-right text-sm text-foreground">
                    {data.contactMethod}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">用户快照</h2>
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title="用户运营详情页即将开放"
              >
                <ExternalLink className="h-3 w-3" />
                查看详情
              </span>
            </div>
            <div className="mt-3 flex gap-3">
              {snap.avatarUrl ? (
                <Image
                  src={snap.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {(snap.nickname || "?").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {snap.nickname || data.userNicknameSnapshot || "未知用户"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{maskEmail(snap.email)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/80 pt-4">
              <div className="rounded-md bg-muted/60 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  <span>当前积分</span>
                </div>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatMetricNumber(snap.currentScore)}
                </p>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" />
                  <span>连续学习</span>
                </div>
                <p className="mt-1 text-base font-semibold text-foreground">{snap.streakDays} 天</p>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>当前段位</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {snap.currentRank ?? "—"}
                </p>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>完成任务</span>
                </div>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {snap.completedTaskCount}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">当前学习计划</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {snap.activePlanName ?? "当前暂无激活学习计划"}
              </p>
            </div>

            <dl className="mt-4 space-y-2.5 border-t border-border/80 pt-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">主工具</dt>
                <dd className="text-right text-foreground">{snap.primaryToolName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">学习等级</dt>
                <dd className="text-right text-foreground">{snap.learningLevelLabel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">最近学习</dt>
                <dd className="text-right text-sm text-foreground">
                  {snap.lastLearningAt ? formatDateTime(snap.lastLearningAt) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">历史工单</dt>
                <dd className="font-medium text-foreground">{snap.totalTicketCount} 条</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">注册时间</dt>
                <dd className="text-right text-sm text-foreground">
                  {snap.createdAt ? formatDateTime(snap.createdAt) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
