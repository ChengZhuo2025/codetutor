"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Lightbulb,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  WifiOff,
  X,
  Zap,
} from "lucide-react"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { Skeleton } from "@/components/ui/skeleton"
import { StatePanel } from "@/components/ui/state-panel"
import type {
  LearningSupportOption,
  Message,
  MessageAttachment,
  QuickAction,
} from "@/features/learning/types"
import type {
  LearningCurrentSessionResponseData,
  LearningMessageResponseData,
} from "@/lib/api/contracts/learning"
import { requestData } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { useAppEventTracker } from "@/providers/app-providers"

type ConnectionState = "online" | "offline" | "reconnecting"

type PendingDraft = {
  text: string
  attachment: MessageAttachment | null
}

const messageKindMeta = {
  system_goal: {
    badge: "学习提示",
    bubbleClass: "border-border/60 bg-surface-2 text-foreground",
    avatarClass: "bg-surface-4 text-muted-foreground",
    avatarLabel: "目",
  },
  coach: {
    badge: "AI 教练",
    bubbleClass: "border-brand/20 bg-brand-dim text-foreground",
    avatarClass: "bg-brand text-brand-foreground",
    avatarLabel: "AI",
  },
  user_input: {
    badge: "我的反馈",
    bubbleClass: "border-border/50 bg-surface-3 text-foreground",
    avatarClass: "bg-surface-4 text-muted-foreground",
    avatarLabel: "我",
  },
  task_feedback: {
    badge: "任务反馈",
    bubbleClass: "border-gold/20 bg-gold-dim text-foreground",
    avatarClass: "bg-gold text-background",
    avatarLabel: "成",
  },
} as const

const quickActionToneClass: Record<QuickAction["tone"], string> = {
  primary: "border-brand/40 bg-brand-dim text-brand hover:border-brand/55 hover:bg-brand/18",
  warning: "border-gold/38 bg-gold-dim text-gold hover:border-gold/50 hover:bg-gold/18",
  secondary:
    "border-border/80 bg-surface-2 text-foreground hover:border-border hover:bg-surface-3",
}

function renderContent(text: string) {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={i} className="font-semibold text-foreground">
          {line.slice(2, -2)}
        </p>
      )
    }
    if (line.startsWith("- ")) {
      return (
        <li key={i} className="ml-4 list-disc text-muted-foreground">
          {line.slice(2)}
        </li>
      )
    }
    if (line.match(/^\d+\. /)) {
      return (
        <li key={i} className="ml-4 list-decimal text-muted-foreground">
          {line.replace(/^\d+\. /, "")}
        </li>
      )
    }

    const boldParts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <p key={i} className={line === "" ? "h-2" : "text-foreground/90"}>
        {boldParts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
        )}
      </p>
    )
  })
}

function createAttachmentFromFile(file: File): MessageAttachment {
  return {
    type: "image",
    url: URL.createObjectURL(file),
    name: file.name,
  }
}

function getInputHint(
  connectionState: ConnectionState,
  isTyping: boolean,
  previewAttachment: MessageAttachment | null,
) {
  if (connectionState === "offline") {
    return "你现在处于离线状态，消息会等待网络恢复后重试。"
  }

  if (connectionState === "reconnecting") {
    return "网络恢复中，稍后即可继续发送消息。"
  }

  if (isTyping) {
    return "AI 正在整理下一步建议..."
  }

  if (previewAttachment) {
    return "截图已附上，适合直接让 AI 帮你定位具体报错。"
  }

  return "把教程、代码、链接或你卡住的地方直接发给我。Enter 发送，Shift+Enter 换行。"
}

type LearnChatProps = {
  learningData: LearningCurrentSessionResponseData
}

export function LearnChat({ learningData }: LearnChatProps) {
  const { trackEvent } = useAppEventTracker()
  const [messages, setMessages] = useState<Message[]>(learningData.messages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(
    null,
  )
  const [sendError, setSendError] = useState<string | null>(null)
  const [failedDraft, setFailedDraft] = useState<PendingDraft | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>("online")
  const [showSupportOptions, setShowSupportOptions] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextMessageId = useRef(learningData.messages.length + 1)
  const reconnectTimerRef = useRef<number | null>(null)

  const { mission, planSummary, resume, rightPanel, supportOptions } = learningData
  const inputHint = getInputHint(connectionState, isTyping, previewAttachment)

  useEffect(() => {
    setMessages(learningData.messages)
    nextMessageId.current = learningData.messages.length + 1
  }, [learningData])

  useEffect(() => {
    const syncConnectionState = () => {
      if (!navigator.onLine) {
        setConnectionState("offline")
        return
      }

      setConnectionState((prev) => {
        if (prev === "offline") {
          if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current)
          }
          reconnectTimerRef.current = window.setTimeout(() => {
            setConnectionState("online")
            reconnectTimerRef.current = null
          }, 1200)
          return "reconnecting"
        }
        return "online"
      })
    }

    syncConnectionState()
    window.addEventListener("online", syncConnectionState)
    window.addEventListener("offline", syncConnectionState)

    return () => {
      window.removeEventListener("online", syncConnectionState)
      window.removeEventListener("offline", syncConnectionState)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, sendError, connectionState, showSupportOptions])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const clamped = Math.min(el.scrollHeight, 24 * 4 + 12)
    el.style.height = `${clamped}px`
  }, [input])

  const allocateMessageId = () => {
    const id = nextMessageId.current
    nextMessageId.current += 1
    return id
  }

  const resetAgent = () => {
    setInput("")
    setPreviewAttachment(null)
    setSendError(null)
    setFailedDraft(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const dispatchDraft = async (draft: PendingDraft) => {
    if (connectionState !== "online") {
      setFailedDraft(draft)
      setSendError("当前网络连接不稳定，消息尚未发出。恢复后可直接重试。")
      return
    }

    const userMessage: Message = {
      id: allocateMessageId(),
      role: "user",
      kind: "user_input",
      title: "我的反馈",
      content: draft.text || "我上传了一张截图，请帮我定位问题。",
      attachment: draft.attachment ?? undefined,
    }

    trackEvent(APP_EVENTS.learningInputSend, {
      hasAttachment: Boolean(draft.attachment),
      contentLength: draft.text.length,
      taskId: learningData.task.taskId,
    })

    setMessages((prev) => [...prev, userMessage])
    resetAgent()
    setShowSupportOptions(false)
    setIsTyping(true)

    try {
      const data = await requestData<LearningMessageResponseData>("/learning/message", {
        method: "POST",
        body: JSON.stringify({
          conversationId: learningData.conversationId,
          taskId: learningData.task.taskId,
          inputType: "text",
          content: draft.text || "我上传了一张截图，请帮我定位问题。",
          clientContext: {
            pagePath: ROUTES.learn,
          },
        }),
      })

      setMessages((prev) => [...prev, data.message])
      setFailedDraft(null)
      setSendError(null)
    } catch (error) {
      setFailedDraft(draft)
      setSendError(error instanceof Error ? error.message : "消息发送失败，请稍后重试。")
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = async () => {
    const draft = {
      text: input.trim(),
      attachment: previewAttachment,
    }

    if ((!draft.text && !draft.attachment) || isTyping) return
    await dispatchDraft(draft)
  }

  const handleQuickAction = (action: QuickAction) => {
    if (isTyping) return

    if (action.label === "我卡住了") {
      trackEvent(APP_EVENTS.learningQuickHelp, {
        action: action.label,
        category: action.category,
        taskId: learningData.task.taskId,
      })
      setShowSupportOptions((prev) => !prev)
      return
    }

    if (action.label === "我完成了") {
      trackEvent(APP_EVENTS.taskCompleted, {
        source: "quick_action",
        taskId: learningData.task.taskId,
      })
    }

    if (action.category === "help" || action.category === "hint") {
      trackEvent(APP_EVENTS.learningQuickHelp, {
        action: action.label,
        category: action.category,
        taskId: learningData.task.taskId,
      })
    }

    void dispatchDraft({ text: action.label, attachment: null })
  }

  const handleSupportOption = (option: LearningSupportOption) => {
    if (isTyping) return

    trackEvent(APP_EVENTS.stuckHelpRequested, {
      helpMode: option.mode,
      taskId: learningData.task.taskId,
    })
    void dispatchDraft({ text: option.prompt, attachment: null })
  }

  const handleRetry = () => {
    if (!failedDraft || connectionState !== "online") return
    setSendError(null)
    void dispatchDraft(failedDraft)
  }

  const handleResume = () => {
    trackEvent(APP_EVENTS.sessionResumed, {
      conversationId: learningData.conversationId,
      taskId: learningData.task.taskId,
    })
    textareaRef.current?.focus()
  }

  const removePreview = () => {
    if (!previewAttachment) return
    URL.revokeObjectURL(previewAttachment.url)
    setPreviewAttachment(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand/20 bg-brand-dim px-2 py-1 text-[11px] font-semibold text-brand">
                当前任务
              </span>
              {connectionState === "offline" && (
                <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                  连接中断
                </span>
              )}
              {connectionState === "reconnecting" && (
                <span className="rounded-full border border-chart-3/20 bg-chart-3/10 px-2 py-1 text-[11px] font-semibold text-chart-3">
                  正在重连
                </span>
              )}
            </div>
            <h2 className="truncate text-lg font-semibold">
              {mission?.title ?? "当前任务信息暂时不可用"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mission
                ? `${mission.tool} · ${mission.stageLabel}`
                : "稍后重试，或从学习地图重新进入本关。"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                本轮学习计划
              </span>
              <span className="rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-xs text-bold text-foreground">
                {planSummary.selectedToolName}
              </span>
              <span className="rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.learningLevelLabel}
              </span>
              <span className="rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.selectionModeLabel}
              </span>
              <span className="rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.pathName ?? "自主学习"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
              <RefreshCw className="h-3 w-3" />
              重头开始
            </button>
            <Link
              href={ROUTES.onboarding}
              className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-dim px-3 py-2 text-xs text-brand transition-colors hover:border-brand/35 hover:bg-brand/18"
            >
              <Plus className="h-3 w-3" />
              新建计划
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {resume ? (
            <div className="rounded-[1.6rem] border border-brand/15 bg-surface-2/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/80">
                    <Sparkles className="h-3.5 w-3.5" />
                    {resume.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{resume.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{resume.lastSeenLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={handleResume}
                  className="shrink-0 rounded-2xl border border-brand/25 bg-brand-dim px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/20"
                >
                  {resume.ctaLabel}
                </button>
              </div>
            </div>
          ) : null}

          {mission ? (
            <div className="rounded-[1.9rem] border border-border/60 bg-surface-2/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/65">
                  <Target className="h-3.5 w-3.5 text-brand" />
                  现在只做这一步
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold leading-8 text-foreground">
                      {rightPanel.currentStep}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {rightPanel.whyThisStep}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[320px] lg:max-w-[360px]">
                    <div className="rounded-2xl border border-border/50 bg-surface-3 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                        建议时长
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                        {mission.estimatedTime}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-surface-3 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                        当前进度
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                        {mission.progressLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gold/20 bg-gold-dim px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gold/80">
                        完成奖励
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gold sm:text-base">
                        {mission.reward}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/45 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-gold" />
                    AI 教练提醒
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {mission.coachCue}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-border/60 bg-surface-2/95 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="h-4 w-4 text-destructive" />
                未获取到任务信息
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                当前任务卡暂时没有拿到可展示的数据。你可以回到学习地图重新进入本关，或者等待联调接口后自动恢复。
              </p>
            </div>
          )}

          {connectionState === "reconnecting" && (
            <StatePanel
              status="loading"
              title="正在恢复连接"
              description="消息与任务上下文会在几秒内重新同步。"
              compact
            />
          )}

          {messages.length === 0 ? (
            <StatePanel
              status="empty"
              title="还没有对话记录"
              description="先从当前一步开始，或者直接把你卡住的内容发给我。"
            />
          ) : (
            messages.map((msg) => {
              const meta = messageKindMeta[msg.kind]
              const isUser = msg.role === "user"

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                      meta.avatarClass,
                    )}
                  >
                    {meta.avatarLabel}
                  </div>

                  <div className="flex max-w-[92%] flex-col gap-2 sm:max-w-[85%]">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
                        {msg.title ?? meta.badge}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "rounded-3xl px-4 py-3.5 text-sm leading-relaxed shadow-[0_10px_40px_rgba(0,0,0,0.08)]",
                        isUser ? "rounded-tr-md" : "rounded-tl-md",
                        meta.bubbleClass,
                      )}
                    >
                      <div className="space-y-1.5">{renderContent(msg.content)}</div>

                      {msg.attachment ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-background/55">
                          <Image
                            src={msg.attachment.url}
                            alt={msg.attachment.name}
                            width={320}
                            height={180}
                            unoptimized
                            className="h-auto w-full object-cover"
                          />
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            已附上截图：{msg.attachment.name}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {msg.kind === "task_feedback" && msg.xp ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold-dim px-3 py-2">
                        <Zap className="h-4 w-4 text-gold" />
                        <span className="text-sm font-semibold text-gold">+{msg.xp} XP</span>
                        <span className="text-xs text-muted-foreground">任务步骤完成</span>
                      </div>
                    ) : null}

                    {msg.nextStep ? (
                      <button className="flex items-center gap-2 self-start rounded-2xl border border-brand/30 bg-brand-dim px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {msg.nextStep}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground">
                AI
              </div>
              <div className="min-w-[220px] rounded-3xl rounded-tl-md border border-brand/15 bg-brand-dim px-4 py-3.5">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand/80">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  AI 正在整理下一步
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 bg-brand/20" />
                  <Skeleton className="h-3 w-40 bg-brand/20" />
                  <Skeleton className="h-3 w-32 bg-brand/20" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 bg-surface-1 px-4 pb-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {sendError ? (
            <StatePanel
              status="error"
              title="消息发送失败"
              description={sendError}
              actionLabel="重试发送"
              onAction={connectionState === "online" ? handleRetry : undefined}
              compact
              className="mb-3"
              extra={
                connectionState !== "online" ? (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <WifiOff className="h-3.5 w-3.5" />
                    当前仍处于离线状态
                  </div>
                ) : null
              }
            />
          ) : null}

          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {learningData.quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  disabled={isTyping || connectionState !== "online"}
                  className={cn(
                    "rounded-full border px-3.5 py-1 text-[12px] transition-colors disabled:opacity-50",
                    quickActionToneClass[action.tone],
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {showSupportOptions ? (
            <div className="mb-3 rounded-[1.5rem] border border-gold/20 bg-gold-dim p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-gold" />
                  先选一种更轻的求助方式
                </div>
                <button
                  type="button"
                  onClick={() => setShowSupportOptions(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-background/55 text-muted-foreground transition-colors hover:border-gold/35 hover:text-foreground"
                  aria-label="关闭求助方式选择"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {supportOptions.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => handleSupportOption(option)}
                    disabled={isTyping || connectionState !== "online"}
                    className="rounded-2xl border border-gold/20 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-background disabled:opacity-50"
                  >
                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {previewAttachment ? (
            <div className="relative mb-3 inline-block overflow-hidden rounded-2xl border border-border/60 bg-surface-2">
              <Image
                src={previewAttachment.url}
                alt={previewAttachment.name}
                width={200}
                height={120}
                unoptimized
                className="h-28 w-auto object-cover"
              />
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">{previewAttachment.name}</span>
                <button
                  type="button"
                  onClick={removePreview}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.6rem] border border-border/60 bg-surface-2 px-3 py-2.5 transition-colors focus-within:border-brand/60 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.10)]">
            <div
              className={cn(
                "flex",
                input.split("\n").length > 1 ? "items-end" : "items-center",
              )}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-surface-3 hover:text-muted-foreground"
                title="发送截图"
              >
                <ImagePlus className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return

                  if (previewAttachment) {
                    URL.revokeObjectURL(previewAttachment.url)
                  }

                  setPreviewAttachment(createAttachmentFromFile(file))
                  event.target.value = ""
                }}
              />

              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="把教程链接、代码片段或你卡住的问题发给我"
                className="scrollbar-none flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/50"
                style={{ maxHeight: `${24 * 4 + 12}px`, overflowY: "auto" }}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && !previewAttachment) || isTyping}
                className={cn(
                  "ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                  (input.trim() || previewAttachment) && !isTyping
                    ? "bg-brand text-brand-foreground hover:bg-brand/90"
                    : "bg-surface-4 text-muted-foreground/40",
                )}
              >
                {isTyping ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground/55">{inputHint}</p>
        </div>
      </div>
    </div>
  )
}
