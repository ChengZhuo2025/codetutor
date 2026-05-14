"use client"

import Image from "next/image"
import { CheckCircle2, Lightbulb, Mic, Pause, Play, RefreshCw, Volume2, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  normalizeAssistantActions,
  shouldRenderMessageTaskPatch,
  shouldStabilizePendingAssistantTone,
} from "@/features/learning/lib/chat-behavior"
import type { Message } from "@/features/learning/types"
import {
  renderPlainContent,
  renderStructuredContent,
  resolveAssistantInteractionType,
  resolveAssistantMessageVariant,
  STREAMING_PLACEHOLDER,
} from "@/features/learning/components/learn-chat-rich-content"
import { cn } from "@/lib/utils"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"

const STREAMING_LOADING_TITLE = "AI 正在思考中"
const STREAMING_LOADING_HINT = "先分析你的输入和当前上下文，再生成回复"

const MESSAGE_ACTION_TONE_CLASS = {
  primary: USER_BUTTON_PRIMARY_CLASS,
  secondary: USER_BUTTON_SECONDARY_CLASS,
  warning: USER_BUTTON_SECONDARY_CLASS,
  success: USER_BUTTON_PRIMARY_CLASS,
} as const

const MESSAGE_KIND_META = {
  system_goal: {
    badge: "学习提示",
    bubbleClass: "text-foreground",
    avatarClass: "bg-surface-4 text-muted-foreground",
    avatarLabel: "目",
  },
  coach: {
    badge: "AI 教练",
    bubbleClass: "text-foreground",
    avatarClass: "bg-brand text-brand-foreground",
    avatarLabel: "AI",
  },
  user_input: {
    badge: "我的反馈",
    bubbleClass: "border-brand/80 bg-brand font-medium text-white dark:text-black",
    avatarClass: "bg-surface-4 text-muted-foreground",
    avatarLabel: "我",
  },
  task_feedback: {
    badge: "任务反馈",
    bubbleClass: "text-foreground",
    avatarClass: "bg-emerald-500 text-white",
    avatarLabel: "成",
  },
} as const

const CHAT_TONE_CLASS = {
  info: {
    panel: "border-border/65 bg-surface-2",
    badge: "border-brand/20 bg-brand-dim/60 text-brand",
    icon: "text-brand",
  },
  warning: {
    panel: "border-gold/20 bg-gold-dim/30",
    badge: "border-gold/25 bg-gold-dim text-gold",
    icon: "text-gold",
  },
  success: {
    panel: "border-teal-200 bg-teal-100",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
} as const

function getTaskPatchDisplayMeta(taskPatch: NonNullable<Message["taskPatch"]>) {
  if (taskPatch.status === "blocked") {
    return {
      badge: "已标记为卡住",
      badgeClass: CHAT_TONE_CLASS.warning.badge,
      panelClass: CHAT_TONE_CLASS.warning.panel,
      iconClass: CHAT_TONE_CLASS.warning.icon,
    }
  }

  if (taskPatch.status === "completed") {
    return {
      badge: "已完成当前关卡",
      badgeClass: CHAT_TONE_CLASS.success.badge,
      panelClass: CHAT_TONE_CLASS.success.panel,
      iconClass: CHAT_TONE_CLASS.success.icon,
    }
  }

  return {
    badge: "继续推进当前关卡",
    badgeClass: CHAT_TONE_CLASS.info.badge,
    panelClass: CHAT_TONE_CLASS.info.panel,
    iconClass: CHAT_TONE_CLASS.info.icon,
  }
}

type LearnChatMessageItemProps = {
  message: Message
  isTyping: boolean
  pendingAssistantMessageId: number | null
  onAssistantAction: (
    message: Message,
    action: {
      label: string
      prompt: string
    },
  ) => void
  onNextStepClick: (message: Message) => void
  onToggleSpeech: (message: Message) => void
  speechState?: "idle" | "loading" | "playing" | "paused"
}

export function LearnChatMessageItem({
  message,
  isTyping,
  pendingAssistantMessageId,
  onAssistantAction,
  onNextStepClick,
  onToggleSpeech,
  speechState = "idle",
}: LearnChatMessageItemProps) {
  const meta = MESSAGE_KIND_META[message.kind]
  const isUser = message.role === "user"
  const shouldUseStablePendingTone =
    message.role === "ai"
      ? shouldStabilizePendingAssistantTone({
          messageId: message.id,
          pendingAssistantMessageId,
        })
      : false
  const interactionType =
    message.role === "ai"
      ? resolveAssistantInteractionType(message, {
          allowContentHeuristics: !shouldUseStablePendingTone,
        })
      : null
  const assistantVariant =
    message.role === "ai" && interactionType
      ? resolveAssistantMessageVariant(message, interactionType)
      : null
  const attachments = message.attachments?.length
    ? message.attachments
    : message.attachment
      ? [message.attachment]
      : []
  const assistantActions =
    message.role === "ai" && message.structuredContent?.actions?.length
      ? normalizeAssistantActions(message.structuredContent.actions)
      : []
  const canReadAloud =
    message.role === "ai" &&
    Boolean(message.speechMessageId) &&
    message.content !== STREAMING_PLACEHOLDER &&
    message.content.trim().length > 0
  const SpeechIcon =
    speechState === "loading"
      ? RefreshCw
      : speechState === "playing"
        ? Pause
        : speechState === "paused"
          ? Play
          : Volume2
  const speechLabel =
    speechState === "loading"
      ? "正在生成语音"
      : speechState === "playing"
        ? "暂停播读"
        : speechState === "paused"
          ? "继续播读"
          : "播读 AI 回复"
  const isSpeechPlaying = speechState === "playing"

  return (
    <div
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            {message.title ?? meta.badge}
          </span>
        </div>

        <div
          className={cn(
            "text-sm leading-relaxed",
            isUser ? "rounded-3xl px-4 py-3.5 rounded-tr-sm" : "pb-1",
            meta.bubbleClass,
          )}
        >
          {message.content === STREAMING_PLACEHOLDER ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-brand">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {STREAMING_LOADING_TITLE}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {STREAMING_LOADING_HINT}
              </p>
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 bg-brand/20" />
                <Skeleton className="h-3 w-44 bg-brand/20" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {message.role === "user"
                ? renderPlainContent(
                    message.content,
                    message.kind === "user_input" ? "inverted" : "default",
                  )
                : renderStructuredContent(
                    message.title,
                    message.content,
                    message.kind,
                    interactionType ?? "teaching",
                    assistantVariant ?? "default",
                    message.taskPatch,
                    message.structuredContent,
                  )}
            </div>
          )}

          {attachments.length ? (
            <div className="mt-3 space-y-2">
              {attachments.map((attachment, index) => (
                <div
                  key={attachment.id ?? `${attachment.name}-${index}`}
                  className="overflow-hidden rounded-2xl border border-border/30 bg-background/25"
                >
                  {attachment.type === "image" && attachment.url ? (
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      width={320}
                      height={180}
                      unoptimized
                      className="h-auto w-full object-cover"
                    />
                  ) : attachment.type === "audio" ? (
                    <div className="flex items-center gap-2 px-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl bg-brand/85 text-brand-foreground">
                        <Mic className="h-4 w-4" />
                      </div>
                      {attachment.url ? (
                        <audio src={attachment.url} controls className="overflow-hidden rounded-3xl h-9 min-w-0 flex-1" />
                      ) : (
                        <div className="min-w-0 flex-1 text-sm text-foreground">
                          语音消息
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="space-y-1 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        {attachment.type === "audio" ? "已附上语音" : "已附上截图"}：{attachment.name}
                      </span>
                    {attachment.processingStatus ? (
                        <span className="rounded-full border border-background/30 bg-background/20 px-2 py-0.5">
                          {attachment.processingStatus}
                        </span>
                      ) : null}
                    </div>
                    {attachment.errorMessage ? (
                      <p className="leading-5 text-destructive">{attachment.errorMessage}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {message.kind === "task_feedback" && message.xp ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-2",
              CHAT_TONE_CLASS.success.badge,
            )}
          >
            <Zap className={cn("h-4 w-4", CHAT_TONE_CLASS.success.icon)} />
            <span className={cn("text-sm font-semibold", CHAT_TONE_CLASS.success.text)}>
              +{message.xp} XP
            </span>
            <span className="text-xs text-muted-foreground">任务步骤完成</span>
          </div>
        ) : null}

        {assistantActions.length || canReadAloud ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {assistantActions.map((action, actionIndex) => (
                <button
                  key={`message-action-${message.id}-${actionIndex}`}
                  type="button"
                  disabled={isTyping}
                  onClick={() => onAssistantAction(message, action)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium",
                    MESSAGE_ACTION_TONE_CLASS[action.tone],
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {canReadAloud ? (
              <div className="flex shrink-0 items-center gap-2">
                {isSpeechPlaying ? (
                  <div
                    aria-hidden="true"
                    className="learn-speech-wave flex h-9 w-16 items-center justify-center gap-1 px-3 text-brand"
                  >
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className="learn-speech-wave-bar block w-1 rounded-full bg-current"
                        style={{ animationDelay: `${bar * 95}ms` }}
                      />
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={isTyping || speechState === "loading"}
                  onClick={() => onToggleSpeech(message)}
                  aria-label={speechLabel}
                  title={speechLabel}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition hover:border-brand/40 hover:text-brand",
                    (isTyping || speechState === "loading") && "pointer-events-none opacity-60",
                    isSpeechPlaying && "border-brand/40 bg-brand-dim text-brand",
                  )}
                >
                  <SpeechIcon className={cn("h-4 w-4", speechState === "loading" && "animate-spin")} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {shouldRenderMessageTaskPatch(message.taskPatch, {
          messageId: message.id,
          pendingAssistantMessageId,
        })
          ? (() => {
              const taskPatch = message.taskPatch
              if (!taskPatch) {
                return null
              }

              const taskPatchMeta = getTaskPatchDisplayMeta(taskPatch)

              return (
                <div
                  className={cn("rounded-2xl border px-3.5 py-3", taskPatchMeta.panelClass)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        taskPatchMeta.badgeClass,
                      )}
                    >
                      {taskPatchMeta.badge}
                    </span>
                    <span className="text-[12px] font-medium text-muted-foreground">
                      当前任务状态已同步
                    </span>
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <Lightbulb
                      className={cn("h-3.5 w-3.5 shrink-0", taskPatchMeta.iconClass)}
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                        下一步建议
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground/90">
                        {taskPatch.suggestedNextAction}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()
          : null}

        {message.nextStep ? (
          <button
            type="button"
            onClick={() => onNextStepClick(message)}
            disabled={isTyping}
            className={cn(
              "flex items-center gap-2 self-start px-3 py-2 text-sm font-medium",
              USER_BUTTON_PRIMARY_CLASS,
              isTyping && "pointer-events-none opacity-60",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {message.nextStep}
          </button>
        ) : null}
      </div>
    </div>
  )
}
