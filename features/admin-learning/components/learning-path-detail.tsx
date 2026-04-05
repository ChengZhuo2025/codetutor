"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock3, RefreshCw, TimerReset, UserRound } from "lucide-react"
import type {
  AdminLearningPathDetailResponseData,
  AdminUpdateLearningPathStatusResponseData,
} from "@/lib/api/contracts/admin-learning"
import { useAppConfirm } from "@/components/app-feedback/app-confirm-provider"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StatePanel } from "@/components/ui/state-panel"
import { ADMIN_ROUTES } from "@/constants/routes"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"
import {
  formatAdminLearningDateTime,
  getAdminLearningStatusMeta,
  getAdminLearningStepStatusMeta,
} from "../lib/view-model"

type LearningPathDetailProps = {
  pathId: string
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function LearningPathDetail({ pathId }: LearningPathDetailProps) {
  const confirm = useAppConfirm()
  const toast = useAppToast()
  const [data, setData] = useState<AdminLearningPathDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittingAction, setSubmittingAction] = useState<"reactivate" | "archive" | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (!silent) {
        setIsLoading(true)
      }
      setError(null)
      try {
        const result = await adminRequestData<AdminLearningPathDetailResponseData>(
          `/admin/learning-paths/${pathId}`,
          { method: "GET" },
          "获取学习路径详情失败",
        )
        setData(result)
      } catch (fetchError) {
        setAuthExpired(isAdminSessionExpiredError(fetchError))
        const message = getAdminApiErrorMessage(fetchError, "网络请求失败")
        if (silent) {
          toast.error(message)
          throw fetchError
        }
        setError(message)
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [pathId, toast],
  )

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchDetail({ silent: true })
      toast.success("已刷新学习路径详情")
    } catch {
      // fetchDetail 已处理提示
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleStatusAction = async (action: "reactivate" | "archive") => {
    const result = await confirm.prompt({
      title: action === "reactivate" ? "确认重新激活该学习路径？" : "确认归档该学习路径？",
      description:
        action === "reactivate"
          ? "重新激活后，该用户会重新回到此学习路径。可补充本次处理原因。"
          : "归档后，该路径仍可查看，但不会继续作为用户可运营路径。可补充归档原因。",
      confirmText: action === "reactivate" ? "重新激活" : "确认归档",
      cancelText: "取消",
      input: {
        label: "处理原因（可选）",
        placeholder: action === "reactivate" ? "例如：用户回访后确认继续学习" : "例如：历史完成路径，运营确认归档",
        defaultValue: "",
        multiline: true,
      },
    })

    if (!result.confirmed) {
      return
    }

    setSubmittingAction(action)
    try {
      const response = await adminRequestData<AdminUpdateLearningPathStatusResponseData>(
        `/admin/learning-paths/${pathId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: result.value.trim() || null,
          }),
        },
        action === "reactivate" ? "重新激活失败" : "归档失败",
      )

      await fetchDetail({ silent: true })
      toast.success(action === "reactivate" ? "已重新激活学习路径" : "已归档学习路径", `当前状态：${response.status}`)
    } catch (submitError) {
      setAuthExpired(isAdminSessionExpiredError(submitError))
      toast.error(getAdminApiErrorMessage(submitError, action === "reactivate" ? "重新激活失败" : "归档失败"))
    } finally {
      setSubmittingAction(null)
    }
  }

  const backLink = (
    <Link
      href={ADMIN_ROUTES.learning}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      返回列表
    </Link>
  )

  if (error && !data) {
    return (
      <div className="space-y-4">
        {backLink}
        <StatePanel
          status="error"
          title="加载失败"
          description={error}
          actionLabel="重试"
          onAction={() => void fetchDetail()}
        />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      </div>
    )
  }

  const statusMeta = getAdminLearningStatusMeta(data.path.status)
  const canReactivate = data.path.status === "interrupted"
  const canArchive = ["completed", "interrupted", "abandoned"].includes(data.path.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {backLink}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void handleRefresh()} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            刷新
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!canReactivate || submittingAction !== null}
            onClick={() => void handleStatusAction("reactivate")}
          >
            <TimerReset className="h-4 w-4" />
            {submittingAction === "reactivate" ? "处理中…" : "重新激活"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!canArchive || submittingAction !== null}
            onClick={() => void handleStatusAction("archive")}
          >
            <BookOpen className="h-4 w-4" />
            {submittingAction === "archive" ? "处理中…" : "归档"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{data.path.pathName}</h1>
              <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-medium", statusMeta.className)}>
                {statusMeta.label}
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {data.path.toolName}
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {data.path.learningLevelLabel}
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {data.path.selectionModeLabel}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm text-muted-foreground">{data.path.pathCode}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {data.path.summary || "暂无路径摘要。"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">运营动作</p>
            <p className="mt-2 text-muted-foreground">
              仅支持将已中断路径重新激活，或将已完成 / 已中断 / 已放弃路径归档。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="学习进度" value={`${data.path.progressPercent}%`} hint={`${data.path.completedSteps}/${data.path.totalSteps} 步骤`} />
        <SummaryCard label="任务完成" value={`${data.path.completedTaskCount}/${data.path.totalTaskCount}`} hint={`进行中 ${data.path.inProgressTaskCount} · 阻塞 ${data.path.blockedTaskCount}`} />
        <SummaryCard label="累计 XP" value={data.path.xpEarned} hint="当前路径已获得积分" />
        <SummaryCard label="学习连续天数" value={data.user.streakDays} hint={data.user.currentRankLabel} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">状态时间线</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "开始学习", value: data.timeline.startedAt },
                { label: "最近活动", value: data.timeline.lastActivityAt },
                { label: "完成时间", value: data.timeline.completedAt },
                { label: "中断时间", value: data.timeline.interruptedAt },
                { label: "放弃时间", value: data.timeline.abandonedAt },
                { label: "归档时间", value: data.timeline.archivedAt },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/70 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm text-foreground">{formatAdminLearningDateTime(item.value)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">步骤</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.steps.length === 0 ? (
                <StatePanel status="empty" title="暂无步骤" description="该学习路径尚未生成可展示的步骤信息。" compact />
              ) : (
                data.steps.map((step) => {
                  const stepMeta = getAdminLearningStepStatusMeta(step.status)
                  return (
                    <div key={step.stepId} className="rounded-xl border border-border bg-background/70 px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/12 px-2 text-xs font-semibold text-primary">
                              {step.stepNo}
                            </span>
                            <p className="text-sm font-medium text-foreground">{step.title}</p>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            奖励 XP {step.rewardXp} · 完成时间 {formatAdminLearningDateTime(step.completedAt)}
                          </p>
                        </div>
                        <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-medium", stepMeta.className)}>
                          {stepMeta.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">最近会话</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.recentSessions.length === 0 ? (
                <StatePanel status="empty" title="暂无最近会话" description="该学习路径还没有沉淀会话记录。" compact />
              ) : (
                data.recentSessions.map((session) => (
                  <div key={session.sessionId} className="rounded-xl border border-border bg-background/70 px-4 py-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{session.sessionId}</p>
                        <p className="mt-2 text-sm text-foreground">
                          {session.latestAssistantSummary || "暂无 AI 摘要。"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground lg:text-right">
                        <p>状态 {session.status}</p>
                        <p className="mt-1">消息数 {session.messageCount}</p>
                        <p className="mt-1">开始于 {formatAdminLearningDateTime(session.startedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              {data.user.avatarUrl ? (
                <Image
                  src={data.user.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                  {(data.user.nickname ?? "?").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">用户快照</h2>
                <p className="truncate text-sm text-muted-foreground">{data.user.nickname || "未命名用户"}</p>
              </div>
            </div>
            <dl className="mt-4">
              <InfoRow label="用户 ID" value={data.user.userId} />
              <Separator />
              <InfoRow label="联系邮箱" value={data.user.email || "暂无"} />
              <Separator />
              <InfoRow label="当前积分" value={String(data.user.currentScore)} />
              <Separator />
              <InfoRow label="当前段位" value={data.user.currentRankLabel} />
              <Separator />
              <InfoRow label="最近学习" value={formatAdminLearningDateTime(data.user.lastLearningAt)} />
            </dl>
            <Button type="button" variant="outline" className="mt-4 w-full gap-1.5" asChild>
              <Link href={`${ADMIN_ROUTES.users}/${data.user.userId}`}>
                <UserRound className="h-4 w-4" />
                查看用户详情
              </Link>
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground">路径摘要</h2>
            <dl className="mt-4">
              <InfoRow label="工具" value={data.path.toolName} />
              <Separator />
              <InfoRow label="等级" value={data.path.learningLevelLabel} />
              <Separator />
              <InfoRow label="模式" value={data.path.selectionModeLabel} />
              <Separator />
              <InfoRow label="总步骤" value={String(data.path.totalSteps)} />
              <Separator />
              <InfoRow label="待开始任务" value={String(data.path.pendingTaskCount)} />
              <Separator />
              <InfoRow label="当前状态" value={statusMeta.label} />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
