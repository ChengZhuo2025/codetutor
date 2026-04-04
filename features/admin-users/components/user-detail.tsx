"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  Flame,
  Loader2,
  Mail,
  MessageSquare,
  ShieldAlert,
  Target,
  UserRound,
} from "lucide-react"
import type { AdminUserDetailResponseData } from "@/lib/api/contracts/admin-users"
import type { AdminFeedbackListResponseData } from "@/lib/api/contracts/feedback"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ADMIN_ROUTES } from "@/constants/routes"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { buildUserDetailFeedbackSummary, getUserTaskCompletionPercent } from "../lib/view-model"

type UserDetailProps = {
  userId: string
}

type UserDetailTab = "overview" | "learning" | "feedback"

function formatDateTime(iso: string | null) {
  if (!iso) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function getOnboardingMeta(onboardingCompleted: boolean | null) {
  if (onboardingCompleted) {
    return {
      label: "已完成引导",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    }
  }

  return {
    label: "未完成引导",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }
}

function getPlanStatusMeta(data: AdminUserDetailResponseData) {
  if (!data.activePathCode) {
    return {
      label: "暂无进行中计划",
      className: "border-border bg-muted/70 text-muted-foreground",
    }
  }

  switch (data.activePathStatus) {
    case "active":
      return {
        label: "学习进行中",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "interrupted":
      return {
        label: "已中断",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    case "completed":
      return {
        label: "已完成",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      }
    case "abandoned":
      return {
        label: "已放弃",
        className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      }
    case "archived":
      return {
        label: "已归档",
        className: "border-border bg-muted/70 text-muted-foreground",
      }
    default:
      return {
        label: "有计划",
        className: "border-primary/20 bg-primary/10 text-primary",
      }
  }
}

function formatSelectionModeLabel(selectionMode: string | null) {
  switch (selectionMode) {
    case "self_directed":
      return "自学模式"
    case "preset_training":
      return "预设训练"
    default:
      return selectionMode ?? "未标注"
  }
}

function formatLearningLevelLabel(learningLevel: string | null) {
  switch (learningLevel) {
    case "beginner":
      return "初级"
    case "intermediate":
      return "中级"
    case "advanced":
      return "高级"
    default:
      return learningLevel ?? "未标注"
  }
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint: string
  icon: typeof Flame
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
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

export function UserDetail({ userId }: UserDetailProps) {
  const [data, setData] = useState<AdminUserDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [activeTab, setActiveTab] = useState<UserDetailTab>("overview")

  const [feedbackData, setFeedbackData] = useState<AdminFeedbackListResponseData | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [wechat, setWechat] = useState("")
  const [contentLanguage, setContentLanguage] = useState("")
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)

  const [saving, setSaving] = useState(false)
  const [softDeleting, setSoftDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const hydrateForm = useCallback((detail: AdminUserDetailResponseData) => {
    setNickname(detail.nickname ?? "")
    setBio(detail.bio ?? "")
    setContactEmail(detail.contactEmail ?? "")
    setWechat(detail.wechat ?? "")
    setContentLanguage(detail.contentLanguage ?? "zh-CN")
    setOnboardingCompleted(Boolean(detail.onboardingCompleted))
  }, [])

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}`,
        { method: "GET" },
        "获取用户详情失败",
      )
      setData(result)
      hydrateForm(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [hydrateForm, userId])

  const fetchFeedbackSummary = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const result = await adminRequestData<AdminFeedbackListResponseData>(
        `/admin/feedback?userId=${encodeURIComponent(userId)}&limit=5&page=1`,
        { method: "GET" },
        "获取用户反馈失败",
      )
      setFeedbackData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setFeedbackError(getAdminApiErrorMessage(fetchError, "获取用户反馈失败"))
    } finally {
      setFeedbackLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchDetail()
    void fetchFeedbackSummary()
  }, [fetchDetail, fetchFeedbackSummary])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: nickname.trim(),
            bio: bio.trim() || null,
            contactEmail: contactEmail.trim() || null,
            wechat: wechat.trim() || null,
            contentLanguage: contentLanguage.trim() || undefined,
            onboardingCompleted,
          }),
        },
        "保存失败",
      )
      setData(result)
      hydrateForm(result)
      window.alert("已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      window.alert(getAdminApiErrorMessage(saveError, "保存失败"))
    } finally {
      setSaving(false)
    }
  }

  const handleSoftDelete = async () => {
    const reason = window.prompt("软删除原因（可选）") ?? ""
    if (!window.confirm("确认软删除该用户？其将无法再使用主站功能。")) {
      return
    }
    setSoftDeleting(true)
    try {
      const result = await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}/soft-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || null }),
        },
        "软删除失败",
      )
      setData(result)
      hydrateForm(result)
      window.alert("已软删除")
    } catch (softDeleteError) {
      setAuthExpired(isAdminSessionExpiredError(softDeleteError))
      window.alert(getAdminApiErrorMessage(softDeleteError, "软删除失败"))
    } finally {
      setSoftDeleting(false)
    }
  }

  const handleRestore = async () => {
    if (!window.confirm("确认恢复该用户？")) {
      return
    }
    setRestoring(true)
    try {
      const result = await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        "恢复失败",
      )
      setData(result)
      hydrateForm(result)
      window.alert("已恢复")
    } catch (restoreError) {
      setAuthExpired(isAdminSessionExpiredError(restoreError))
      window.alert(getAdminApiErrorMessage(restoreError, "恢复失败"))
    } finally {
      setRestoring(false)
    }
  }

  const feedbackSummary = useMemo(
    () => buildUserDetailFeedbackSummary(feedbackData?.items ?? []),
    [feedbackData?.items],
  )

  if (error) {
    return <StatePanel status="error" title="加载失败" description={error} />
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        加载中…
      </div>
    )
  }

  const onboardingMeta = getOnboardingMeta(data.onboardingCompleted)
  const planStatusMeta = getPlanStatusMeta(data)
  const completionPercent = getUserTaskCompletionPercent(data)
  const feedbackListHref = `${ADMIN_ROUTES.feedback}?userId=${encodeURIComponent(data.userId)}`
  const feedbackItems = feedbackData?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
          <Link href={ADMIN_ROUTES.users}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl}
              alt=""
              width={52}
              height={52}
              className="h-13 w-13 shrink-0 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-primary/12 text-lg font-semibold text-primary">
              {(data.nickname ?? "?").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {data.nickname || "未命名用户"}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${onboardingMeta.className}`}
              >
                {onboardingMeta.label}
              </span>
              <span
                className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${planStatusMeta.className}`}
              >
                {planStatusMeta.label}
              </span>
              {data.deletedAt ? (
                <span className="inline-flex rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
                  已软删
                </span>
              ) : null}
            </div>
            <div className="mt-2 space-y-1">
              <p className="font-mono text-xs text-muted-foreground break-all">{data.userId}</p>
              <p className="text-sm text-muted-foreground">
                {data.contactEmail || data.authEmail || "暂无邮箱"}
                {data.authPhone ? ` · ${data.authPhone}` : ""}
              </p>
              {data.deletedAt ? (
                <p className="text-sm text-destructive">
                  软删时间：{formatDateTime(data.deletedAt)}
                  {data.deletedReason ? ` · ${data.deletedReason}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={feedbackListHref}>
              <MessageSquare className="h-4 w-4" />
              查看工单
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="连续打卡"
          value={data.streakDays ?? 0}
          hint="连续学习天数"
          icon={Flame}
        />
        <SummaryCard
          label="当前积分"
          value={data.currentScore ?? 0}
          hint={`当前段位 ${data.currentRankCode ?? "未定级"}`}
          icon={Target}
        />
        <SummaryCard
          label="计划完成率"
          value={`${completionPercent}%`}
          hint={data.activePathName ?? "暂无进行中计划"}
          icon={BookOpen}
        />
        <SummaryCard
          label="待跟进工单"
          value={feedbackSummary.pending}
          hint={`累计 ${feedbackSummary.total} 条`}
          icon={ShieldAlert}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {[
          { key: "overview", label: "用户概览" },
          { key: "learning", label: "学习详情" },
          { key: "feedback", label: `反馈关联${feedbackSummary.total > 0 ? `（${feedbackSummary.total}）` : ""}` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as UserDetailTab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="space-y-6">
          {activeTab === "overview" ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">运营概览</h2>
                </div>
                <dl className="mt-4 divide-y divide-border">
                  <InfoRow label="主工具" value={data.primaryToolName ?? "未设置"} />
                  <InfoRow label="内容语言" value={data.contentLanguage ?? "zh-CN"} />
                  <InfoRow label="最近学习" value={formatDateTime(data.lastLearningAt)} />
                  <InfoRow label="注册时间" value={formatDateTime(data.profileCreatedAt)} />
                  <InfoRow label="资料更新时间" value={formatDateTime(data.profileUpdatedAt)} />
                  <InfoRow label="Auth 邮箱" value={data.authEmail ?? "暂无"} />
                  <InfoRow label="Auth 手机" value={data.authPhone ?? "暂无"} />
                </dl>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">当前学习计划</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      展示当前 active path 的状态、进度和任务分布。
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${planStatusMeta.className}`}
                  >
                    {planStatusMeta.label}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {data.activePathName ?? "暂无进行中计划"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatLearningLevelLabel(data.activePathLearningLevel)} · {formatSelectionModeLabel(data.activePathSelectionMode)}
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">任务完成率</span>
                      <span className="font-medium text-foreground">{completionPercent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">已完成任务</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {data.activePathCompletedTaskCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">进行中</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {data.activePathInProgressTaskCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">待开始</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {data.activePathPendingTaskCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">阻塞</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {data.activePathBlockedTaskCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "learning" ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-base font-semibold text-foreground">学习链路详情</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">当前计划</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {data.activePathName ?? "暂无进行中计划"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      路径代码：{data.activePathCode ?? "未分配"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      开始时间：{formatDateTime(data.activePathStartedAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      最近活动：{formatDateTime(data.activePathLastActivityAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">阶段进度</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {data.activePathCompletedSteps ?? 0} / {data.activePathTotalSteps ?? 0} 步
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      当前完成率 {completionPercent}%
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      学习等级：{formatLearningLevelLabel(data.activePathLearningLevel)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      路径模式：{formatSelectionModeLabel(data.activePathSelectionMode)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-base font-semibold text-foreground">任务统计总览</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">累计已完成</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {data.completedTaskCountTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">累计进行中</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {data.inProgressTaskCountTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">累计待开始</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {data.pendingTaskCountTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">累计阻塞</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {data.blockedTaskCountTotal}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "feedback" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">反馈关联</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      展示该用户最近 5 条真实反馈工单与待跟进情况。
                    </p>
                  </div>
                  <Button type="button" variant="outline" asChild>
                    <Link href={feedbackListHref}>查看全部工单</Link>
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">累计工单</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{feedbackSummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">待跟进</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{feedbackSummary.pending}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">最近一条</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {feedbackSummary.latestTicket?.title ?? "暂无反馈"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">最近工单</h3>
                </div>
                {feedbackLoading ? (
                  <div className="space-y-3 p-5">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-18 animate-pulse rounded-xl border border-border bg-background" />
                    ))}
                  </div>
                ) : feedbackError ? (
                  <div className="p-5">
                    <StatePanel status="error" title="获取用户反馈失败" description={feedbackError} />
                  </div>
                ) : feedbackItems.length > 0 ? (
                  <div className="divide-y divide-border">
                    {feedbackItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`${ADMIN_ROUTES.feedback}/${item.id}`}
                        className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {item.statusLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{item.feedbackTypeLabel}</span>
                          <span>创建于 {formatDateTime(item.submittedAt)}</span>
                          <span>回复 {item.replyCount} 条</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">该用户暂无反馈工单。</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">运营侧资料编辑</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              保留管理员修正入口，但不再作为详情页主视图。
            </p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nickname">昵称</Label>
                <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">简介</Label>
                <Textarea id="bio" rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">联系邮箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wechat">微信</Label>
                <Input id="wechat" value={wechat} onChange={(event) => setWechat(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contentLanguage">界面语言</Label>
                <Input
                  id="contentLanguage"
                  value={contentLanguage}
                  onChange={(event) => setContentLanguage(event.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={onboardingCompleted}
                  onChange={(event) => setOnboardingCompleted(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                已完成新手引导
              </label>
              <Button type="button" className="w-full" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "保存中…" : "保存修改"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">只读快照</h2>
            <dl className="mt-4 space-y-1">
              <InfoRow label="当前计划" value={data.activePathName ?? "暂无"} />
              <InfoRow label="计划模式" value={formatSelectionModeLabel(data.activePathSelectionMode)} />
              <InfoRow label="学习等级" value={formatLearningLevelLabel(data.activePathLearningLevel)} />
              <InfoRow label="主工具" value={data.primaryToolName ?? "未设置"} />
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">账号操作</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              仅保留受控的软删除与恢复动作，避免误操作影响学习主链路。
            </p>
            <Separator className="my-4" />
            {!data.deletedAt ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => void handleSoftDelete()}
                disabled={softDeleting}
              >
                {softDeleting ? "处理中…" : "软删除用户"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void handleRestore()}
                disabled={restoring}
              >
                {restoring ? "处理中…" : "恢复用户"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
