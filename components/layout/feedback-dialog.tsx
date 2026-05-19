"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, MessageSquareText, RefreshCw } from "lucide-react"
import {
  FEEDBACK_TYPES,
  type CreateFeedbackRequest,
  type FeedbackMineListResponseData,
  type FeedbackSource,
  type FeedbackTicketDetailResponseData,
  type FeedbackType,
} from "@/lib/api/contracts/feedback"
import { requestData } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatePanel } from "@/components/ui/state-panel"
import {
  DIALOG_PANEL_CLASS,
  USER_ICON_BUTTON_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type FeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: FeedbackSource
}

type FeedbackTab = "submit" | "mine"

type FeedbackFormState = {
  feedbackType: FeedbackType
  title: string
  content: string
  contactMethod: string
}

const feedbackTypeOptions: Array<{
  value: FeedbackType
  label: string
}> = [
  { value: "visual_design", label: "界面视觉" },
  { value: "interaction_flow", label: "交互流程" },
  { value: "feature_request", label: "功能建议" },
  { value: "issue_report", label: "问题反馈" },
]

const initialForm: FeedbackFormState = {
  feedbackType: FEEDBACK_TYPES[1],
  title: "",
  content: "",
  contactMethod: "",
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无"
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "replied":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "closed":
      return "border-border/70 bg-muted/65 text-foreground/75 dark:border-border/70 dark:bg-foreground/8"
    case "in_review":
      return "border-brand/20 bg-brand/10 text-brand"
    default:
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
}

export function FeedbackDialog({
  open,
  onOpenChange,
  source = "settings_popover",
}: FeedbackDialogProps) {
  const [activeTab, setActiveTab] = useState<FeedbackTab>("submit")
  const [form, setForm] = useState<FeedbackFormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [listState, setListState] = useState<{
    status: "idle" | "loading" | "error" | "empty" | "success"
    data: FeedbackMineListResponseData["items"]
    message: string | null
  }>({
    status: "idle",
    data: [],
    message: null,
  })
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [detailState, setDetailState] = useState<{
    status: "idle" | "loading" | "error" | "empty" | "success"
    data: FeedbackTicketDetailResponseData | null
    message: string | null
  }>({
    status: "idle",
    data: null,
    message: null,
  })
  const selectedTicketIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId
  }, [selectedTicketId])

  const isValid = useMemo(
    () => form.title.trim().length >= 4 && form.content.trim().length >= 10,
    [form.content, form.title],
  )

  const updateField = <K extends keyof FeedbackFormState>(
    key: K,
    value: FeedbackFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (submitError) {
      setSubmitError(null)
    }
    if (submitSuccess) {
      setSubmitSuccess(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab("submit")
      setForm(initialForm)
      setIsSubmitting(false)
      setSubmitError(null)
      setSubmitSuccess(null)
      setListState({
        status: "idle",
        data: [],
        message: null,
      })
      setSelectedTicketId(null)
      setDetailState({
        status: "idle",
        data: null,
        message: null,
      })
    }

    onOpenChange(nextOpen)
  }

  const loadMyFeedbackList = useCallback(async (preferredTicketId?: string | null) => {
    setListState((prev) => ({
      status: "loading",
      data: prev.data,
      message: null,
    }))

    try {
      const data = await requestData<FeedbackMineListResponseData>("/feedback/mine")
      const nextSelectedId =
        preferredTicketId
        || selectedTicketIdRef.current
        || data.items[0]?.id
        || null

      setListState({
        status: data.items.length > 0 ? "success" : "empty",
        data: data.items,
        message:
          data.items.length > 0
            ? null
            : "你提交过的反馈会展示在这里，官方回复后也会同步出现在此处。",
      })
      setSelectedTicketId(nextSelectedId)

      if (!nextSelectedId) {
        setDetailState({
          status: "empty",
          data: null,
          message: "还没有反馈记录，先提交第一条反馈吧。",
        })
      }
    } catch (error) {
      setListState({
        status: "error",
        data: [],
        message: error instanceof Error ? error.message : "加载反馈记录失败，请稍后重试。",
      })
      setDetailState({
        status: "error",
        data: null,
        message: error instanceof Error ? error.message : "加载反馈记录失败，请稍后重试。",
      })
    }
  }, [])

  const loadFeedbackDetail = useCallback(async (ticketId: string) => {
    setDetailState({
      status: "loading",
      data: null,
      message: null,
    })

    try {
      const data = await requestData<FeedbackTicketDetailResponseData>(`/feedback/mine/${ticketId}`)
      setDetailState({
        status: "success",
        data,
        message: null,
      })
    } catch (error) {
      setDetailState({
        status: "error",
        data: null,
        message: error instanceof Error ? error.message : "加载反馈详情失败，请稍后重试。",
      })
    }
  }, [])

  useEffect(() => {
    if (!open || activeTab !== "mine") {
      return
    }

    void loadMyFeedbackList()
  }, [activeTab, loadMyFeedbackList, open])

  useEffect(() => {
    if (!open || activeTab !== "mine" || !selectedTicketId) {
      if (activeTab === "mine") {
        setDetailState((prev) =>
          prev.status === "idle"
            ? prev
            : {
                status: "empty",
                data: null,
                message: "请选择一条反馈记录查看详情。",
              })
      }
      return
    }

    void loadFeedbackDetail(selectedTicketId)
  }, [activeTab, loadFeedbackDetail, open, selectedTicketId])

  const handleSubmit = async () => {
    if (!isValid) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const payload: CreateFeedbackRequest = {
        feedbackType: form.feedbackType,
        title: form.title.trim(),
        content: form.content.trim(),
        contactMethod: form.contactMethod.trim() || null,
        source,
      }

      const data = await requestData<{ ticketId: string }>("/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setForm(initialForm)
      setSubmitSuccess("反馈已提交，我们会尽快查看并回复。")
      setActiveTab("mine")
      await loadMyFeedbackList(data.ticketId)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "提交反馈失败，请稍后重试。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(DIALOG_PANEL_CLASS, "max-h-[90vh] overflow-y-auto sm:max-w-[720px] p-0")}>
        <div className="overflow-hidden">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">建议反馈</DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                提交你对产品的建议、问题和使用感受，也可以查看官方回复进度。
              </DialogDescription>
            </DialogHeader>

            <div className={cn("mt-4 inline-flex gap-2")}>
              <button
                type="button"
                onClick={() => setActiveTab("submit")}
                className={cn(
                  "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === "submit"
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )}
              >
                提交反馈
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mine")}
                className={cn(
                  "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === "mine"
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )}
              >
                我的反馈
              </button>
            </div>
          </div>

          {activeTab === "submit" ? (
            <>
              <div className="space-y-5 px-5 py-5">
                {submitError ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {submitError}
                  </div>
                ) : null}

                {submitSuccess ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {submitSuccess}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">反馈类型</Label>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {feedbackTypeOptions.map((option) => {
                      const active = form.feedbackType === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField("feedbackType", option.value)}
                          className={cn(
                            "flex items-center gap-3 rounded-3xl border px-4 py-2 text-left transition-colors",
                            active
                              ? "border-brand/20 bg-brand/10 text-brand dark:border-brand/30 dark:bg-brand/15"
                              : "border-border/50 bg-surface-2 text-foreground/80 hover:border-border hover:bg-surface-1 hover:text-foreground dark:border-border dark:bg-surface-2 dark:hover:border-white/20 dark:hover:bg-surface-1",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                              active
                                ? "border-brand bg-brand/10"
                                : "border-border bg-surface-1 dark:border-white/20",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors",
                                active ? "bg-brand" : "bg-transparent",
                              )}
                            />
                          </div>
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-title" className="text-sm font-medium text-muted-foreground">
                    标题
                  </Label>
                  <Input
                    id="feedback-title"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="一句话概括你的建议或问题"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-content" className="text-sm font-medium text-muted-foreground">
                    反馈内容
                  </Label>
                  <Textarea
                    id="feedback-content"
                    value={form.content}
                    onChange={(event) => updateField("content", event.target.value)}
                    placeholder="详细描述你遇到的问题、建议或希望优化的地方"
                    rows={4}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>至少 10 个字符，尽量写清楚场景、问题和预期效果。</span>
                    <span>{form.content.trim().length}/1000</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-contact" className="text-sm font-medium text-muted-foreground">
                    接受回访方式
                  </Label>
                  <Input
                    id="feedback-contact"
                    value={form.contactMethod}
                    onChange={(event) => updateField("contactMethod", event.target.value)}
                    placeholder="手机号、微信号或邮箱，选填"
                  />
                </div>
              </div>

              <div className={cn("flex gap-3 border-t px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleOpenChange(false)}
                  className={cn("flex-1", USER_PANEL_OUTLINE_BUTTON_CLASS)}
                >
                  取消
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交中
                    </>
                  ) : (
                    "提交反馈"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-0 sm:grid-cols-[250px_minmax(0,1fr)]">
              <div className={cn("border-b sm:border-b-0 sm:border-r", USER_PANEL_DIVIDER_CLASS)}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">反馈记录</p>
                    <p className="mt-1 text-xs text-muted-foreground">查看处理状态与回复</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void loadMyFeedbackList()}
                    className={cn("h-9 w-9", USER_ICON_BUTTON_CLASS)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-[56vh] space-y-2 overflow-y-auto px-3 pb-4 scrollbar-none">
                  {listState.status === "loading" || listState.status === "idle" ? (
                    <StatePanel
                      status="loading"
                      title="加载反馈记录中"
                      description="正在同步你的反馈列表。"
                      compact
                    />
                  ) : null}

                  {listState.status === "error" ? (
                    <StatePanel
                      status="error"
                      title="反馈列表加载失败"
                      description={listState.message ?? undefined}
                      actionLabel="重试"
                      onAction={() => void loadMyFeedbackList()}
                      compact
                    />
                  ) : null}

                  {listState.status === "empty" ? (
                    <StatePanel
                      status="empty"
                      title="还没有反馈记录"
                      description={listState.message ?? undefined}
                      compact
                    />
                  ) : null}

                  {listState.status === "success"
                    ? listState.data.map((ticket) => {
                        const isActive = selectedTicketId === ticket.id

                        return (
                            <button
                            key={ticket.id}
                            type="button"
                            onClick={() => setSelectedTicketId(ticket.id)}
                              className={cn(
                                "group relative w-full overflow-hidden rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                                isActive
                                  ? "border-brand/35 bg-brand/10"
                                  : "border-border/70 bg-surface-2 hover:border-border hover:bg-surface-1",
                              )}
                            >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "line-clamp-1 text-sm font-semibold transition-colors",
                                    isActive ? "text-foreground" : "text-foreground/88 group-hover:text-foreground",
                                  )}
                                >
                                  {ticket.title}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                                      isActive
                                        ? "border-brand/20 bg-brand/10 text-brand"
                                        : "border-border/70 bg-muted/60 text-foreground/60 dark:border-border/70 dark:bg-foreground/6",
                                    )}
                                  >
                                    {ticket.feedbackTypeLabel}
                                  </span>
                                  {ticket.replyCount > 0 ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                                        "border-chart-3/20 bg-chart-3/10 text-chart-3",
                                        isActive
                                          ? "border-chart-3/20 bg-chart-3/10"
                                          : "dark:text-chart-3",
                                      )}
                                    >
                                      <MessageSquareText
                                        className="h-3 w-3 shrink-0 text-chart-3"
                                        aria-hidden
                                      />
                                      {ticket.replyCount} 条回复
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                  getStatusBadgeClassName(ticket.status),
                                )}
                              >
                                {ticket.statusLabel}
                              </span>
                            </div>

                            <div
                              className={cn(
                                "mt-3 flex items-center justify-between text-[11px] transition-colors",
                                isActive ? "text-foreground/55" : "text-foreground/40 group-hover:text-foreground/50",
                              )}
                            >
                              <span>更新于 {formatDateTime(ticket.lastReplyAt ?? ticket.updatedAt)}</span>
                            </div>
                          </button>
                        )
                      })
                    : null}
                </div>
              </div>

              <div className="min-h-[56vh] px-5 py-4">
                {listState.status === "loading" || listState.status === "idle" ? (
                  <StatePanel
                    status="loading"
                    title="加载反馈记录中"
                    description="正在同步你的反馈列表与详情。"
                  />
                ) : null}

                {listState.status === "error" ? (
                  <StatePanel
                    status="error"
                    title="反馈记录加载失败"
                    description={listState.message ?? undefined}
                    actionLabel="重试"
                    onAction={() => void loadMyFeedbackList()}
                  />
                ) : null}

                {listState.status === "empty" ? (
                  <StatePanel
                    status="empty"
                    title="还没有反馈记录"
                    description="你提交过的建议和问题会在这里展示，收到官方回复后也会同步在此处查看。"
                    actionLabel="去提交反馈"
                    onAction={() => setActiveTab("submit")}
                  />
                ) : null}

                {listState.status === "success" && (detailState.status === "loading" || detailState.status === "idle") ? (
                  <StatePanel
                    status="loading"
                    title="加载反馈详情中"
                    description="正在同步该反馈的处理状态和回复记录。"
                  />
                ) : null}

                {listState.status === "success" && detailState.status === "error" ? (
                  <StatePanel
                    status="error"
                    title="反馈详情加载失败"
                    description={detailState.message ?? undefined}
                    actionLabel="重试"
                    onAction={() => selectedTicketId && void loadFeedbackDetail(selectedTicketId)}
                  />
                ) : null}

                {listState.status === "success" && detailState.status === "empty" ? (
                  <StatePanel
                    status="empty"
                    title="请选择一条反馈"
                    description={detailState.message ?? undefined}
                  />
                ) : null}

                {listState.status === "success" && detailState.status === "success" && detailState.data ? (
                  <div className="space-y-4">
                    <div className="rounded-[24px] p-4 border border-border/70 bg-surface-2 dark:border-white/14">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            getStatusBadgeClassName(detailState.data.status),
                          )}
                        >
                          {detailState.data.statusLabel}
                        </span>
                        <span className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-foreground/65 dark:border-border/70 dark:bg-foreground/6">
                          {detailState.data.feedbackTypeLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          提交于 {formatDateTime(detailState.data.submittedAt)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-foreground">
                        {detailState.data.title}
                      </h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/88">
                        {detailState.data.content}
                      </p>

                      {detailState.data.contactMethod ? (
                        <div className="mt-3 border-t border-border/70 pt-3 text-sm text-muted-foreground">
                          回访方式：{detailState.data.contactMethod}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <MessageSquareText className="h-4 w-4 text-brand" />
                        回复记录
                      </div>

                      {detailState.data.replies.length === 0 ? (
                        <StatePanel
                          status="empty"
                          title="暂时还没有回复"
                          description="我们收到后会尽快处理，你可以稍后回来查看。"
                          compact
                        />
                      ) : (
                        detailState.data.replies.map((reply) => {
                          const isAdmin = reply.authorType === "admin" || reply.authorType === "system"

                          return (
                            <div
                              key={reply.id}
                              className={cn(
                                "rounded-xl border px-4 py-3",
                                isAdmin
                                  ? "border-brand/20 bg-brand/10"
                                  : "border-border bg-surface-2",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">
                                  {isAdmin ? "官方回复" : "你的补充"}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(reply.createdAt)}
                                </span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                                {reply.content}
                              </p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
