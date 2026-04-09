"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Lightbulb,
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
  LearningInteractionType,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningTaskPatch,
} from "@/lib/api/contracts/learning"
import type {
  CompleteTaskResponseData,
  UpdateTaskStatusResponseData,
} from "@/lib/api/contracts/task"
import { apiFetch, requestData } from "@/lib/api/client"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
} from "@/lib/learning/structured-message"
import { cn } from "@/lib/utils"
import { useAppEventTracker } from "@/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DIALOG_PANEL_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
  USER_PANEL_SECTION_CLASS,
} from "@/components/ui/surface-styles"

type ConnectionState = "online" | "offline" | "reconnecting"

type PendingDraft = {
  text: string
  attachment: MessageAttachment | null
}

type SSEEventHandler = (event: string, data: Record<string, unknown>) => void

const STREAMING_PLACEHOLDER = "__streaming_placeholder__"
const STREAMING_BATCH_SIZE = 16
const STREAMING_BATCH_DELAY_MS = 70
const STREAMING_LOADING_TITLE = "AI 正在思考中"
const STREAMING_LOADING_HINT = "先分析你的输入和当前上下文，再生成回复"

type AssistantMessageVariant =
  | "default"
  | "hint"
  | "example"
  | "breakdown"
  | "blocked_help"
  | "path_guidance"
  | "review"
  | "completion"

type AssistantMessageInteractionMeta = {
  label: string
  hint: string
  panelClass: string
  iconClass: string
  chipClass: string
  summaryClass: string
  sectionClass: string
  orderedBadgeClass: string
  listIconClass: string
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
    bubbleClass: "border-emerald-500/20 bg-emerald-500/10 text-foreground",
    avatarClass: "bg-emerald-500 text-white",
    avatarLabel: "成",
  },
} as const

const quickActionToneClass: Record<QuickAction["tone"], string> = {
  primary: "border-brand/40 bg-brand-dim text-brand hover:border-brand/55 hover:bg-brand/18",
  warning: "border-gold/38 bg-gold-dim text-gold hover:border-gold/50 hover:bg-gold/18",
  secondary:
    "border-border/80 bg-surface-2 text-foreground hover:border-border hover:bg-surface-3",
}

const messageActionToneClass = {
  primary: "border-brand/30 bg-brand-dim text-brand hover:bg-brand/18",
  secondary:
    "border-border/80 bg-surface-2 text-foreground hover:border-border hover:bg-surface-3",
  warning: "border-gold/25 bg-gold-dim text-gold hover:bg-gold/18",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/16",
} as const

const assistantMessageVariantMeta: Record<
  AssistantMessageVariant,
  {
    label: string
    hint: string
    panelClass: string
    iconClass: string
    chipClass: string
    summaryClass: string
  }
> = {
  default: {
    label: "教练引导",
    hint: "先给你当前关卡最值得执行的一步。",
    panelClass: "border-brand/20 bg-background/50",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim text-brand",
    summaryClass: "text-foreground",
  },
  hint: {
    label: "轻量提示",
    hint: "先给方向，不直接展开完整答案。",
    panelClass: "border-gold/20 bg-background/50",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
  },
  example: {
    label: "最小示例",
    hint: "先跑通最小结果，再决定是否扩展。",
    panelClass: "border-chart-3/20 bg-background/50",
    iconClass: "text-chart-3",
    chipClass: "border-chart-3/20 bg-chart-3/10 text-chart-3",
    summaryClass: "text-foreground",
  },
  breakdown: {
    label: "拆解步骤",
    hint: "把当前任务压缩成更容易验证的小动作。",
    panelClass: "border-brand/20 bg-background/50",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim text-brand",
    summaryClass: "text-foreground",
  },
  blocked_help: {
    label: "排查建议",
    hint: "先定位卡点，再决定下一步修改动作。",
    panelClass: "border-gold/20 bg-background/50",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
  },
  path_guidance: {
    label: "下一步建议",
    hint: "优先把眼前这一步做成，而不是一次铺得太大。",
    panelClass: "border-brand/20 bg-background/50",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim text-brand",
    summaryClass: "text-foreground",
  },
  review: {
    label: "复盘建议",
    hint: "回看结果，确认做对了什么、还差什么。",
    panelClass: "border-chart-5/20 bg-background/50",
    iconClass: "text-chart-5",
    chipClass: "border-chart-5/20 bg-chart-5/10 text-chart-5",
    summaryClass: "text-foreground",
  },
  completion: {
    label: "完成反馈",
    hint: "总结这一步收获，并准备进入下一关。",
    panelClass: "border-emerald-500/20 bg-background/50",
    iconClass: "text-emerald-600",
    chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    summaryClass: "text-emerald-700",
  },
}

const assistantMessageInteractionMeta: Record<
  LearningInteractionType,
  AssistantMessageInteractionMeta
> = {
  teaching: {
    label: "教练引导",
    hint: "围绕当前关卡给出最小下一步，先做成再扩展。",
    panelClass: "border-brand/20 bg-background/50",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim text-brand",
    summaryClass: "text-foreground",
    sectionClass: "border-brand/16 bg-brand-dim/45",
    orderedBadgeClass: "bg-brand/12 text-brand",
    listIconClass: "text-brand",
  },
  blocked_help: {
    label: "排查建议",
    hint: "先收敛问题来源，再决定要改哪里。",
    panelClass: "border-gold/20 bg-background/50",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
    sectionClass: "border-gold/18 bg-gold-dim/55",
    orderedBadgeClass: "bg-gold-dim text-gold",
    listIconClass: "text-gold",
  },
  task_review: {
    label: "复盘建议",
    hint: "回看当前结果，确认做对了什么、还差什么。",
    panelClass: "border-chart-5/20 bg-background/50",
    iconClass: "text-chart-5",
    chipClass: "border-chart-5/20 bg-chart-5/10 text-chart-5",
    summaryClass: "text-foreground",
    sectionClass: "border-chart-5/16 bg-chart-5/10",
    orderedBadgeClass: "bg-chart-5/12 text-chart-5",
    listIconClass: "text-chart-5",
  },
  completion_feedback: {
    label: "完成反馈",
    hint: "确认这一步已经完成，并把收获转成下一步动作。",
    panelClass: "border-emerald-500/20 bg-background/50",
    iconClass: "text-emerald-600",
    chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    summaryClass: "text-emerald-700",
    sectionClass: "border-emerald-500/18 bg-emerald-500/8",
    orderedBadgeClass: "bg-emerald-500/12 text-emerald-600",
    listIconClass: "text-emerald-600",
  },
  path_guidance: {
    label: "下一步建议",
    hint: "优先把当前这一步做实，再判断是否进入后续扩展。",
    panelClass: "border-brand/20 bg-background/50",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim text-brand",
    summaryClass: "text-foreground",
    sectionClass: "border-brand/16 bg-brand-dim/45",
    orderedBadgeClass: "bg-brand/12 text-brand",
    listIconClass: "text-brand",
  },
}

type MessageInlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }

type MessageBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }

function tokenizeInlineText(text: string): MessageInlineToken[] {
  const parts = text.split(/\*\*(.*?)\*\*/g)

  return parts
    .filter((part) => part.length > 0)
    .map((part, index) =>
      index % 2 === 1
        ? { type: "strong" as const, value: part }
        : { type: "text" as const, value: part },
    )
}

function renderInlineText(text: string, keyPrefix: string) {
  return tokenizeInlineText(text).map((token, index) =>
    token.type === "strong" ? (
      <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-foreground">
        {token.value}
      </strong>
    ) : (
      <span key={`${keyPrefix}-text-${index}`}>{token.value}</span>
    ),
  )
}

function parseMessageBlocks(text: string): MessageBlock[] {
  const lines = text.split("\n")
  const blocks: MessageBlock[] = []
  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return
    }

    const textValue = paragraphBuffer.join(" ").trim()
    if (textValue) {
      blocks.push({
        type: "paragraph",
        text: textValue,
      })
    }
    paragraphBuffer = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ""

    if (!line) {
      flushParagraph()
      continue
    }

    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      flushParagraph()
      blocks.push({
        type: "heading",
        text: line.slice(2, -2).trim(),
      })
      continue
    }

    if (line.startsWith("- ")) {
      flushParagraph()
      const items: string[] = []
      let pointer = index

      while (pointer < lines.length) {
        const current = lines[pointer]?.trim() ?? ""
        if (!current.startsWith("- ")) {
          break
        }
        items.push(current.slice(2).trim())
        pointer += 1
      }

      blocks.push({
        type: "unordered_list",
        items,
      })
      index = pointer - 1
      continue
    }

    if (/^\d+\. /.test(line)) {
      flushParagraph()
      const items: string[] = []
      let pointer = index

      while (pointer < lines.length) {
        const current = lines[pointer]?.trim() ?? ""
        if (!/^\d+\. /.test(current)) {
          break
        }
        items.push(current.replace(/^\d+\. /, "").trim())
        pointer += 1
      }

      blocks.push({
        type: "ordered_list",
        items,
      })
      index = pointer - 1
      continue
    }

    paragraphBuffer.push(line)
  }

  flushParagraph()
  return blocks
}

function renderPlainContent(text: string) {
  return text.split("\n").map((line, index) =>
    line === "" ? (
      <div key={`spacer-${index}`} className="h-2" />
    ) : (
      <p key={`line-${index}`} className="text-foreground/90">
        {renderInlineText(line, `plain-${index}`)}
      </p>
    ),
  )
}

function resolveAssistantInteractionType(message: Message): LearningInteractionType {
  if (message.structuredContent?.interactionType) {
    return message.structuredContent.interactionType
  }

  if (message.kind === "task_feedback" || message.taskPatch?.status === "completed") {
    return "completion_feedback"
  }

  const title = message.title ?? ""
  const content = message.content

  if (
    title.includes("排查")
    || message.taskPatch?.status === "blocked"
    || /报错|错误|failed|失败|卡住/i.test(content)
  ) {
    return "blocked_help"
  }

  if (title.includes("下一步")) {
    return "path_guidance"
  }

  if (title.includes("复盘")) {
    return "task_review"
  }

  return "teaching"
}

function resolveAssistantMessageVariant(
  message: Message,
  interactionType: LearningInteractionType,
): AssistantMessageVariant {
  if (message.structuredContent?.variant) {
    return message.structuredContent.variant
  }

  if (interactionType === "completion_feedback") {
    return "completion"
  }

  if (interactionType === "blocked_help") {
    return "blocked_help"
  }

  if (interactionType === "task_review") {
    return "review"
  }

  if (interactionType === "path_guidance") {
    return "path_guidance"
  }

  const title = message.title ?? ""

  if (title.includes("最小示例") || title.includes("示例")) {
    return "example"
  }

  if (title.includes("拆小") || title.includes("拆细")) {
    return "breakdown"
  }

  if (title.includes("提示")) {
    return "hint"
  }

  return "default"
}

function renderAssistantMessageLead(
  interactionType: LearningInteractionType,
  variant: AssistantMessageVariant,
) {
  const meta = assistantMessageInteractionMeta[interactionType]
  const subtypeMeta =
    interactionType === "teaching" && variant !== "default"
      ? assistantMessageVariantMeta[variant]
      : null
  const Icon =
    interactionType === "blocked_help"
      ? AlertCircle
      : interactionType === "completion_feedback"
        ? CheckCircle2
        : interactionType === "path_guidance"
          ? Target
          : interactionType === "task_review"
              ? RefreshCw
              : Lightbulb

  return (
    <div className={cn("mb-3 rounded-2xl border px-3.5 py-3", meta.panelClass)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-1 h-4 w-4 shrink-0", meta.iconClass)} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                meta.chipClass,
              )}
            >
              {meta.label}
            </span>
            {subtypeMeta ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  subtypeMeta.chipClass,
                )}
              >
                {subtypeMeta.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {subtypeMeta ? subtypeMeta.hint : meta.hint}
          </p>
        </div>
      </div>
    </div>
  )
}

function renderStructuredContent(
  text: string,
  kind: Message["kind"],
  interactionType: LearningInteractionType,
  variant: AssistantMessageVariant,
  structuredContent?: Message["structuredContent"],
) {
  const fallbackBlocks = parseMessageBlocks(text)
  const firstFallbackBlock = fallbackBlocks[0] ?? null
  const fallbackHasSummary = firstFallbackBlock?.type === "paragraph"
  const summaryText =
    structuredContent?.summary
    ?? (fallbackHasSummary ? firstFallbackBlock.text : null)
  const detailBlocks =
    structuredContent?.blocks
    ?? (fallbackHasSummary ? fallbackBlocks.slice(1) : fallbackBlocks)
  const interactionMeta = assistantMessageInteractionMeta[interactionType]
  const sections =
    structuredContent?.sections && structuredContent.sections.length > 0
      ? structuredContent.sections
      : [
          {
            title: null,
            tone:
              interactionType === "completion_feedback"
                ? "success"
                : interactionType === "blocked_help"
                  ? "warning"
                  : interactionType === "path_guidance"
                    || interactionType === "task_review"
                    || variant === "example"
                    || variant === "hint"
                    ? "info"
                    : "default",
            blocks: detailBlocks,
          },
        ]

  return (
    <div className="space-y-3">
      {renderAssistantMessageLead(interactionType, variant)}

      {summaryText ? (
        <div className="rounded-2xl border border-background/60 bg-background/45 px-3.5 py-3">
          <p className={cn("text-sm font-medium leading-6", interactionMeta.summaryClass)}>
            {renderInlineText(summaryText, "summary")}
          </p>
        </div>
      ) : null}

      {sections.map((section, sectionIndex) => {
        const sectionToneClass =
          section.tone === "success"
            ? "border-emerald-500/18 bg-emerald-500/8"
            : section.tone === "warning"
              ? "border-gold/18 bg-gold-dim/55"
              : section.tone === "info"
                ? interactionMeta.sectionClass
                : "border-background/60 bg-background/40"

        return (
          <div
            key={`section-${sectionIndex}`}
            className={cn("rounded-2xl border px-3.5 py-3", sectionToneClass)}
          >
            {section.title ? (
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {renderInlineText(section.title, `section-title-${sectionIndex}`)}
              </div>
            ) : null}

            <div className="space-y-3">
              {section.blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <div
              key={`heading-${sectionIndex}-${blockIndex}`}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70"
            >
              {renderInlineText(block.text, `heading-${sectionIndex}-${blockIndex}`)}
            </div>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${sectionIndex}-${blockIndex}`}
              className="text-sm leading-6 text-foreground/90"
            >
              {renderInlineText(block.text, `paragraph-${sectionIndex}-${blockIndex}`)}
            </p>
          )
        }

        if (block.type === "unordered_list") {
          return (
            <div
              key={`unordered-${sectionIndex}-${blockIndex}`}
              className="space-y-2 rounded-2xl border border-background/60 bg-background/40 px-3.5 py-3"
            >
              {block.items.map((item, itemIndex) => (
                <div
                  key={`unordered-item-${sectionIndex}-${blockIndex}-${itemIndex}`}
                  className="flex items-start gap-2.5"
                >
                  <CheckCircle2
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0",
                      kind === "task_feedback" || interactionType === "completion_feedback"
                        ? "text-emerald-600"
                        : interactionMeta.listIconClass,
                    )}
                  />
                  <p className="text-sm leading-6 text-foreground/90">
                    {renderInlineText(
                      item,
                      `unordered-${sectionIndex}-${blockIndex}-${itemIndex}`,
                    )}
                  </p>
                </div>
              ))}
            </div>
          )
        }

        return (
          <div
            key={`ordered-${sectionIndex}-${blockIndex}`}
            className="space-y-2 rounded-2xl border border-background/60 bg-background/40 px-3.5 py-3"
          >
            {block.items.map((item, itemIndex) => (
              <div
                key={`ordered-item-${sectionIndex}-${blockIndex}-${itemIndex}`}
                className="flex items-start gap-2.5"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    interactionMeta.orderedBadgeClass,
                  )}
                >
                  {itemIndex + 1}
                </div>
                <p className="text-sm leading-6 text-foreground/90">
                  {renderInlineText(
                    item,
                    `ordered-${sectionIndex}-${blockIndex}-${itemIndex}`,
                  )}
                </p>
              </div>
            ))}
          </div>
        )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
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
    return "AI 正在分析你的输入并生成回复..."
  }

  if (previewAttachment) {
    return "截图已附上，适合直接让 AI 帮你定位具体报错。"
  }

  return "把教程、代码、链接或你卡住的地方直接发给我。Enter 发送，Shift+Enter 换行。"
}

function resolveTaskStateFromPatch(
  taskPatch: LearningTaskPatch | null | undefined,
  fallbackState: LearningCurrentSessionResponseData["task"]["status"],
) {
  if (!taskPatch || taskPatch.status === "completed") {
    return fallbackState
  }

  return taskPatch.status
}

function parseTaskPatchPayload(payload: Record<string, unknown>): LearningTaskPatch | null {
  if (typeof payload.taskId !== "string") {
    return null
  }

  if (
    payload.status !== "in_progress"
    && payload.status !== "blocked"
    && payload.status !== "completed"
  ) {
    return null
  }

  if (typeof payload.suggestedNextAction !== "string") {
    return null
  }

  return {
    taskId: payload.taskId,
    status: payload.status,
    suggestedNextAction: payload.suggestedNextAction,
  }
}

function parseStructuredContentPayload(payload: Record<string, unknown>) {
  return parseStoredStructuredLearningMessageContent(payload.structuredContent ?? null)
}

function getTaskPatchDisplayMeta(taskPatch: LearningTaskPatch) {
  if (taskPatch.status === "blocked") {
    return {
      badge: "已标记为卡住",
      badgeClass: "border-gold/25 bg-gold-dim text-gold",
      panelClass: "border-gold/20 bg-gold-dim/55",
      iconClass: "text-gold",
    }
  }

  if (taskPatch.status === "completed") {
    return {
      badge: "已完成当前关卡",
      badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      panelClass: "border-emerald-500/20 bg-emerald-500/8",
      iconClass: "text-emerald-600",
    }
  }

  return {
    badge: "继续推进当前关卡",
    badgeClass: "border-brand/20 bg-brand-dim text-brand",
    panelClass: "border-brand/20 bg-brand-dim/60",
    iconClass: "text-brand",
  }
}

async function consumeSSE(
  response: Response,
  onEvent: SSEEventHandler,
) {
  if (!response.body) {
    throw new Error("流式响应为空。")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const boundary = buffer.indexOf("\n\n")
      if (boundary < 0) {
        break
      }

      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      const lines = rawEvent.split("\n")
      const eventLine = lines.find((line) => line.startsWith("event:"))
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())

      if (!eventLine || dataLines.length === 0) {
        continue
      }

      const event = eventLine.slice(6).trim()
      const data = JSON.parse(dataLines.join("")) as Record<string, unknown>
      onEvent(event, data)
    }
  }
}

type LearnChatProps = {
  learningData: LearningCurrentSessionResponseData
  onRequestRefresh: () => void
  onOpenMaterialPlanDialog?: (links?: string[]) => void
}

function extractHttpLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/g) ?? []
  const normalized = matches
    .map((raw) => raw.replace(/[),.;!?]+$/, "").trim())
    .filter(Boolean)
  // preserve order + unique; planner flow enforces single link
  return Array.from(new Set(normalized))
}

export function LearnChat({
  learningData,
  onRequestRefresh,
  onOpenMaterialPlanDialog,
}: LearnChatProps) {
  const { trackEvent } = useAppEventTracker()
  const [messages, setMessages] = useState<Message[]>(learningData.messages)
  const [conversationId, setConversationId] = useState<string | null>(
    learningData.conversationId,
  )
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(
    null,
  )
  const [sendError, setSendError] = useState<string | null>(null)
  const [failedDraft, setFailedDraft] = useState<PendingDraft | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>("online")
  const [showSupportOptions, setShowSupportOptions] = useState(false)
  const [taskState, setTaskState] = useState(learningData.task.status)
  const [historyPagination, setHistoryPagination] = useState(
    learningData.historyPagination,
  )
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [pendingAssistantMessageId, setPendingAssistantMessageId] = useState<number | null>(
    null,
  )
  const [linkChoiceOpen, setLinkChoiceOpen] = useState(false)
  const [linkChoiceLinks, setLinkChoiceLinks] = useState<string[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextMessageId = useRef(learningData.messages.length + 1)
  const reconnectTimerRef = useRef<number | null>(null)
  const streamBufferRef = useRef("")
  const streamFlushTimerRef = useRef<number | null>(null)
  const streamTargetMessageIdRef = useRef<number | null>(null)
  const streamHasVisibleContentRef = useRef(false)
  const prependScrollMetricsRef = useRef<{
    previousScrollHeight: number
    previousScrollTop: number
  } | null>(null)

  const { mission, planSummary, resume, rightPanel, supportOptions } = learningData
  const inputHint = getInputHint(connectionState, isTyping, previewAttachment)

  useEffect(() => {
    setMessages(learningData.messages)
    setConversationId(learningData.conversationId)
    setTaskState(learningData.task.status)
    setHistoryPagination(learningData.historyPagination)
    setHistoryError(null)
    setIsLoadingHistory(false)
    setPendingAssistantMessageId(null)
    nextMessageId.current = learningData.messages.length + 1
    streamBufferRef.current = ""
    streamTargetMessageIdRef.current = null
    streamHasVisibleContentRef.current = false
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
      if (streamFlushTimerRef.current) {
        window.clearTimeout(streamFlushTimerRef.current)
      }
    }
  }, [])

  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    const metrics = prependScrollMetricsRef.current

    if (container && metrics) {
      const scrollDelta = container.scrollHeight - metrics.previousScrollHeight
      container.scrollTop = metrics.previousScrollTop + scrollDelta
      prependScrollMetricsRef.current = null
      return
    }

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

  const createClientMessageId = () =>
    `msg_client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const clearStreamFlushTimer = () => {
    if (streamFlushTimerRef.current) {
      window.clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
  }

  const appendAssistantChunk = (messageId: number, chunk: string) => {
    if (!chunk) {
      return
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content:
                message.content === STREAMING_PLACEHOLDER
                  ? chunk
                  : `${message.content}${chunk}`,
            }
          : message,
      ),
    )
  }

  const scheduleStreamFlush = (delayMs = STREAMING_BATCH_DELAY_MS) => {
    if (streamFlushTimerRef.current) {
      return
    }

    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null

      const messageId = streamTargetMessageIdRef.current
      if (messageId === null) {
        return
      }

      const buffered = streamBufferRef.current
      if (!buffered) {
        return
      }

      let chunk = buffered
      if (buffered.length > STREAMING_BATCH_SIZE) {
        const punctuationIndex = buffered
          .slice(0, STREAMING_BATCH_SIZE + 1)
          .search(/[，。！？；：\n]/)

        chunk =
          punctuationIndex >= 0
            ? buffered.slice(0, punctuationIndex + 1)
            : buffered.slice(0, STREAMING_BATCH_SIZE)
      }

      streamBufferRef.current = buffered.slice(chunk.length)
      appendAssistantChunk(messageId, chunk)

      if (streamBufferRef.current) {
        scheduleStreamFlush()
      }
    }, delayMs)
  }

  const enqueueStreamDelta = (messageId: number, delta: string) => {
    if (!delta) {
      return
    }

    streamTargetMessageIdRef.current = messageId

    if (!streamHasVisibleContentRef.current) {
      streamHasVisibleContentRef.current = true
      appendAssistantChunk(messageId, delta)
      return
    }

    streamBufferRef.current += delta

    if (
      streamBufferRef.current.length >= STREAMING_BATCH_SIZE
      || /[，。！？；：\n]/.test(streamBufferRef.current)
    ) {
      scheduleStreamFlush(30)
      return
    }

    scheduleStreamFlush()
  }

  const flushRemainingStreamDelta = () => {
    clearStreamFlushTimer()

    const messageId = streamTargetMessageIdRef.current
    const buffered = streamBufferRef.current

    if (messageId !== null && buffered) {
      streamBufferRef.current = ""
      appendAssistantChunk(messageId, buffered)
    }
  }

  const resetStreamState = () => {
    clearStreamFlushTimer()
    streamBufferRef.current = ""
    streamTargetMessageIdRef.current = null
    streamHasVisibleContentRef.current = false
    setPendingAssistantMessageId(null)
  }

  const resetAgent = () => {
    setInput("")
    setPreviewAttachment(null)
    setSendError(null)
    setFailedDraft(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const appendTaskFeedbackMessage = (data: CompleteTaskResponseData) => {
    const lines = [data.completionSummary]

    if (data.scoreDelta > 0) {
      lines.push("", `本次获得 +${data.scoreDelta} XP，当前累计 ${data.currentScore} XP。`)
    }

    if (data.rankChanged) {
      lines.push(`当前段位已提升为 ${data.currentRank}。`)
    }

    if (data.nextTask) {
      lines.push("", `下一关：${data.nextTask.title}`)
    }

    const message: Message = {
      id: allocateMessageId(),
      role: "ai",
      kind: "task_feedback",
      title: "任务反馈",
      content: lines.join("\n"),
      structuredContent: buildStructuredLearningMessageContent({
        title: "任务反馈",
        kind: "task_feedback",
        interactionType: "completion_feedback",
        content: lines.join("\n"),
        taskPatch: {
          taskId: learningData.task.taskId,
          status: "completed",
          suggestedNextAction: data.nextTask
            ? `进入下一关：${data.nextTask.title}`
            : "回到地图查看本轮学习计划状态",
        },
      }),
      xp: data.scoreDelta > 0 ? data.scoreDelta : undefined,
      nextStep: data.nextTask ? `进入下一关：${data.nextTask.title}` : "本轮学习计划已完成",
    }

    setMessages((prev) => [...prev, message])
  }

  const syncTaskStatus = async (
    status: "in_progress" | "blocked",
    reason?: string | null,
  ) => {
    const data = await requestData<UpdateTaskStatusResponseData>("/task/update-status", {
      method: "POST",
      body: JSON.stringify({
        taskId: learningData.task.taskId,
        status,
        reason,
      }),
    })

    setTaskState(data.taskStatus)
    return data
  }

  const completeCurrentTask = async () => {
    if (connectionState !== "online") {
      setSendError("当前网络连接不稳定，完成结果尚未提交。恢复后请重试。")
      return
    }

    const userMessage: Message = {
      id: allocateMessageId(),
      role: "user",
      kind: "user_input",
      title: "我的反馈",
      content: "我完成了",
    }

    setMessages((prev) => [...prev, userMessage])
    setShowSupportOptions(false)
    setIsTyping(true)
    setSendError(null)

    try {
      const data = await requestData<CompleteTaskResponseData>("/task/complete", {
        method: "POST",
        body: JSON.stringify({
          taskId: learningData.task.taskId,
          conversationId,
        }),
      })

      setTaskState("completed")
      appendTaskFeedbackMessage(data)
      setFailedDraft(null)
      setInput("")
      setPreviewAttachment(null)

      window.setTimeout(() => {
        onRequestRefresh()
      }, 400)
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "任务完成失败，请稍后重试。")
    } finally {
      setIsTyping(false)
    }
  }

  const dispatchDraft = async (
    draft: PendingDraft,
    options?: {
      preserveBlockedStatus?: boolean
    },
  ) => {
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

    const assistantMessageId = allocateMessageId()
    setPendingAssistantMessageId(assistantMessageId)
    streamTargetMessageIdRef.current = assistantMessageId
    streamBufferRef.current = ""
    streamHasVisibleContentRef.current = false

    try {
      if (taskState === "blocked" && !options?.preserveBlockedStatus) {
        await syncTaskStatus("in_progress")
      }

      const clientMessageId = createClientMessageId()
      let assistantInserted = false

      const ensureAssistantMessage = (
        title = "AI 教练引导",
        initialContent = STREAMING_PLACEHOLDER,
      ) => {
        if (assistantInserted) {
          return
        }

        assistantInserted = true
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "ai",
            kind: "coach",
            title,
            content: initialContent,
          },
        ])
      }

      ensureAssistantMessage()

      const response = await apiFetch("/learning/message", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          conversationId,
          taskId: learningData.task.taskId,
          clientMessageId,
          inputType: "text",
          content: draft.text || "我上传了一张截图，请帮我定位问题。",
          stream: true,
          clientContext: {
            pagePath: ROUTES.learn,
          },
        }),
      })

      const contentType = response.headers.get("content-type") ?? ""

      if (contentType.includes("text/event-stream")) {
        await consumeSSE(response, (event, payload) => {
          if (event === "session_started") {
            setConversationId(
              typeof payload.conversationId === "string" ? payload.conversationId : null,
            )
            return
          }

          if (event === "assistant_delta") {
            const delta =
              typeof payload.delta === "string"
                ? payload.delta
                : ""

            if (!delta) {
              return
            }

            enqueueStreamDelta(assistantMessageId, delta)
            return
          }

          if (event === "task_patch") {
            const taskPatch = parseTaskPatchPayload(payload)
            if (!taskPatch) {
              return
            }

            setTaskState((prev) => resolveTaskStateFromPatch(taskPatch, prev))
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      taskPatch,
                    }
                  : message,
              ),
            )
            return
          }

          if (event === "assistant_done") {
            flushRemainingStreamDelta()
            const structuredContent = parseStructuredContentPayload(payload)
            const title =
              typeof payload.title === "string" ? payload.title : "AI 教练引导"
            const kind =
              payload.kind === "task_feedback" ? "task_feedback" : "coach"

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      title,
                      kind,
                      structuredContent,
                    }
                  : message,
              ),
            )
            return
          }

          if (event === "error") {
            throw new Error(
              typeof payload.message === "string"
                ? payload.message
                : "流式消息发送失败，请稍后重试。",
            )
          }
        })
      } else {
        const apiResponse = (await response.json()) as {
          code: string
          message: string
          data: LearningMessageResponseData | null
        }

        if (apiResponse.code !== "OK" || !apiResponse.data) {
          throw new Error(apiResponse.message || "消息发送失败，请稍后重试。")
        }

        const responseData = apiResponse.data
        resetStreamState()
        setConversationId(responseData.conversationId)
        setTaskState(resolveTaskStateFromPatch(responseData.taskPatch, responseData.taskState))
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  ...responseData.message,
                  id: assistantMessageId,
                }
              : message,
          ),
        )
      }

      setFailedDraft(null)
      setSendError(null)
    } catch (error) {
      resetStreamState()
      setMessages((prev) =>
        prev.filter((message) => message.id !== assistantMessageId),
      )
      setFailedDraft(draft)
      setSendError(error instanceof Error ? error.message : "消息发送失败，请稍后重试。")
    } finally {
      flushRemainingStreamDelta()
      resetStreamState()
      setIsTyping(false)
    }
  }

  const handleSend = async () => {
    const draft = {
      text: input.trim(),
      attachment: previewAttachment,
    }

    if ((!draft.text && !draft.attachment) || isTyping) return

    if (!draft.attachment && draft.text === "我完成了") {
      await completeCurrentTask()
      return
    }

    const planSummary = learningData.planSummary
    if (
      planSummary.selectionMode === "self_directed"
      && draft.text
      && !draft.attachment
    ) {
      const links = extractHttpLinks(draft.text)
      if (links.length > 0) {
        setLinkChoiceLinks(links)
        setLinkChoiceOpen(true)
        return
      }
    }

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
      void completeCurrentTask()
      return
    }

    if (action.category === "help" || action.category === "hint") {
      trackEvent(APP_EVENTS.learningQuickHelp, {
        action: action.label,
        category: action.category,
        taskId: learningData.task.taskId,
      })

      void (async () => {
        try {
          await syncTaskStatus("blocked", action.label)
          await dispatchDraft(
            { text: action.label, attachment: null },
            { preserveBlockedStatus: true },
          )
        } catch (error) {
          setSendError(error instanceof Error ? error.message : "更新任务状态失败，请稍后重试。")
        }
      })()
      return
    }

    void dispatchDraft({ text: action.label, attachment: null })
  }

  const handleSupportOption = (option: LearningSupportOption) => {
    if (isTyping) return

    trackEvent(APP_EVENTS.stuckHelpRequested, {
      helpMode: option.mode,
      taskId: learningData.task.taskId,
    })

    void (async () => {
      try {
        await syncTaskStatus("blocked", option.label)
          await dispatchDraft(
            { text: option.prompt, attachment: null },
            { preserveBlockedStatus: true },
          )
      } catch (error) {
        setSendError(error instanceof Error ? error.message : "更新任务状态失败，请稍后重试。")
      }
    })()
  }

  const handleRetry = () => {
    if (!failedDraft || connectionState !== "online") return
    setSendError(null)
    void dispatchDraft(failedDraft)
  }

  const handleResume = () => {
    trackEvent(APP_EVENTS.sessionResumed, {
      conversationId,
      taskId: learningData.task.taskId,
    })

    if (taskState === "blocked") {
      void syncTaskStatus("in_progress").catch((error) => {
        setSendError(error instanceof Error ? error.message : "恢复任务状态失败，请稍后重试。")
      })
    }

    textareaRef.current?.focus()
  }

  const handleLoadEarlierMessages = async () => {
    if (
      !conversationId
      || !historyPagination.hasMore
      || historyPagination.nextBeforeSequenceNo === null
      || isLoadingHistory
    ) {
      return
    }

    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const query = new URLSearchParams({
        conversationId,
        beforeSequenceNo: String(historyPagination.nextBeforeSequenceNo),
        limit: "20",
      })

      const data = await requestData<LearningMessagesResponseData>(
        `/learning/messages?${query.toString()}`,
      )

      const container = scrollContainerRef.current
      prependScrollMetricsRef.current =
        container
          ? {
              previousScrollHeight: container.scrollHeight,
              previousScrollTop: container.scrollTop,
            }
          : null

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id))
        const incoming = data.messages.filter((message) => !existingIds.has(message.id))
        return [...incoming, ...prev]
      })
      setHistoryPagination(data.pagination)
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "加载更早消息失败，请稍后重试。")
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const removePreview = () => {
    if (!previewAttachment) return
    URL.revokeObjectURL(previewAttachment.url)
    setPreviewAttachment(null)
  }

  return (
    <div className="contents">
      <Dialog open={linkChoiceOpen} onOpenChange={setLinkChoiceOpen}>
        <DialogContent
          className={cn(
            DIALOG_PANEL_CLASS,
            "max-h-[75vh] overflow-y-auto rounded-2xl p-0 sm:max-w-[520px]",
          )}
        >
          <div className={cn("border-b px-5 pt-5 pb-4", USER_PANEL_DIVIDER_CLASS)}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-base">检测到教程链接</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                你想用这些链接生成学习计划，还是继续发给 AI 导师聊一聊？
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className={cn("rounded-2xl px-3 py-2 text-sm text-muted-foreground", USER_PANEL_SECTION_CLASS)}>
              {linkChoiceLinks.map((link) => (
                <div key={link} className="truncate">
                  {link}
                </div>
              ))}
            </div>
            {linkChoiceLinks.length > 1 ? (
              <p className="rounded-xl border border-gold/25 bg-gold-dim px-3 py-2 text-xs text-gold">
                当前一次学习计划仅支持 1 条教程链接。请删减为单条后再生成计划，或继续把消息发给导师讨论。
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className={cn("rounded-[10px]", USER_PANEL_OUTLINE_BUTTON_CLASS)}
                disabled={linkChoiceLinks.length !== 1}
                onClick={() => {
                  setLinkChoiceOpen(false)
                  onOpenMaterialPlanDialog?.(linkChoiceLinks)
                }}
              >
                生成学习计划
              </Button>
              <Button
                type="button"
                className="rounded-[10px]"
                onClick={async () => {
                  setLinkChoiceOpen(false)
                  await dispatchDraft({ text: input.trim(), attachment: null })
                }}
              >
                继续发给导师
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/80 bg-surface-1/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="relative">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand/20 bg-brand-dim px-2 py-0.5 text-[11px] font-semibold text-brand">
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
            </div>
            <p className="text-xs text-muted-foreground">
              {mission
                ? `${mission.tool} · ${mission.stageLabel}`
                : "稍后重试，或从学习地图重新进入本关。"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                本轮学习计划
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-bold text-foreground">
                {planSummary.selectedToolName}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.learningLevelLabel}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.selectionModeLabel}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                {planSummary.pathName ?? "自主学习"}
              </span>
            </div>
          </div>

          <div className="lg:absolute lg:right-0 lg:top-3 lg:mt-0">
            <button className="flex items-center gap-1 whitespace-nowrap rounded-3xl border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
              <RefreshCw className="h-3 w-3" />
              重头开始
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-5 sm:px-6 sm:py-6"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {conversationId && historyPagination.hasMore ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadEarlierMessages}
                disabled={isLoadingHistory}
                className="rounded-full border border-border/70 bg-surface-2 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingHistory ? "正在加载更早消息..." : "加载更早消息"}
              </button>
              {historyError ? (
                <p className="text-xs text-destructive">{historyError}</p>
              ) : null}
            </div>
          ) : null}

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
            <div className="rounded-[1.9rem] border border-border bg-surface-2/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
                  <Target className="h-3.5 w-3.5 text-brand" />
                  现在只做这一步
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold leading-8 text-foreground">
                      {rightPanel.currentStep}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {rightPanel.whyThisStep}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 lg:min-w-[320px] lg:max-w-[360px]">
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
            <div className="rounded-[1.75rem] border border-border bg-surface-2/95 p-4">
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
              const interactionType =
                msg.role === "ai" ? resolveAssistantInteractionType(msg) : null
              const assistantVariant =
                msg.role === "ai" && interactionType
                  ? resolveAssistantMessageVariant(msg, interactionType)
                  : null

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
                    {msg.content === STREAMING_PLACEHOLDER ? (
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
                          {msg.role === "user"
                            ? renderPlainContent(msg.content)
                            : renderStructuredContent(
                                msg.content,
                                msg.kind,
                                interactionType ?? "teaching",
                                assistantVariant ?? "default",
                                msg.structuredContent,
                              )}
                        </div>
                      )}

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
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                        <Zap className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-600">+{msg.xp} XP</span>
                        <span className="text-xs text-muted-foreground">任务步骤完成</span>
                      </div>
                    ) : null}

                    {msg.role === "ai" && msg.structuredContent?.actions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {msg.structuredContent.actions.map((action, actionIndex) => (
                          <button
                            key={`message-action-${msg.id}-${actionIndex}`}
                            type="button"
                            disabled={isTyping}
                            onClick={() => {
                              void dispatchDraft({
                                text: action.prompt,
                                attachment: null,
                              })
                            }}
                            className={cn(
                              "rounded-2xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                              messageActionToneClass[action.tone],
                            )}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {msg.taskPatch ? (() => {
                      const taskPatchMeta = getTaskPatchDisplayMeta(msg.taskPatch)

                      return (
                        <div
                          className={cn(
                            "rounded-2xl border px-3.5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
                            taskPatchMeta.panelClass,
                          )}
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
                            <span className="text-[11px] font-medium text-muted-foreground">
                              当前任务状态已同步
                            </span>
                          </div>
                          <div className="mt-2 flex items-start gap-2">
                            <Lightbulb
                              className={cn("h-3.5 w-3.5 shrink-0", taskPatchMeta.iconClass)}
                            />
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                                下一步建议
                              </p>
                              <p className="mt-1 text-sm leading-6 text-foreground/90">
                                {msg.taskPatch.suggestedNextAction}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })() : null}

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

          {isTyping && pendingAssistantMessageId === null && (
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
              {learningData.planSummary.selectionMode === "self_directed"
              && !learningData.planSummary.hasMaterialPlan ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterialPlanDialog?.([])
                  }}
                  disabled={isTyping || connectionState !== "online"}
                  className={cn(
                    "rounded-full border px-3.5 py-1 text-[12px] transition-colors disabled:opacity-50",
                    "border-brand/40 bg-brand-dim text-brand hover:border-brand/55 hover:bg-brand/18",
                  )}
                >
                  生成学习计划
                </button>
              ) : null}
            </div>
          </div>

          {showSupportOptions ? (
            <div className="mb-3 rounded-3xl border border-gold/20 bg-gold-dim p-4">
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
            <div className="relative mb-3 inline-block overflow-hidden rounded-2xl border border-border bg-surface-2">
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

          <div className="rounded-4xl border border-border bg-surface-2 px-2.5 py-2 transition-colors focus-within:border-brand/60 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.10)]">
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
                  "ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl transition-all",
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
    </div>
  )
}
