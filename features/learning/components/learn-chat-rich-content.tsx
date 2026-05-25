"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Check, CheckCircle2, Copy, Lightbulb, RefreshCw, Target } from "lucide-react"
import type { Message } from "@/features/learning/types"
import type { LearningInteractionType, LearningTaskPatch } from "@/lib/api/contracts/learning"
import {
  parseStoredStructuredLearningMessageContent,
  resolveRenderableStructuredLearningMessageContent,
} from "@/lib/learning/structured-message"
import { cn } from "@/lib/utils"
import { shouldRenderStructuredMessageSection } from "@/features/learning/lib/chat-behavior"

export const STREAMING_PLACEHOLDER = "__streaming_placeholder__"

export type AssistantMessageVariant =
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

type MessageInlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "code"; value: string }

type ParsedMarkdownTable = {
  headers: string[]
  rows: string[][]
}

const CHAT_TONE_CLASS = {
  info: {
    panel: "border-brand/15 bg-brand/10",
    badge: "border-brand/20 bg-brand-dim/60 text-brand",
    icon: "text-brand",
  },
  warning: {
    panel: "border-brand/15 bg-brand/10",
    badge: "border-gold/25 bg-gold-dim text-gold",
    icon: "text-gold",
  },
  success: {
    panel: "border-border/10 bg-surface-3/75",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
} as const

const ASSISTANT_MESSAGE_VARIANT_META: Record<
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
    label: "学习引导",
    hint: "这里是当前任务的练习重点，按步骤做一小步就好。",
    panelClass: "border-brand/20 bg-surface-2",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim/60 text-brand",
    summaryClass: "text-foreground",
  },
  hint: {
    label: "轻量提示",
    hint: "先给方向，不直接展开完整答案。",
    panelClass: "border-gold/20 bg-surface-2",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
  },
  example: {
    label: "最小示例",
    hint: "先跑通最小结果，再决定是否扩展。",
    panelClass: "border-chart-3/20 bg-surface-2",
    iconClass: "text-chart-3",
    chipClass: "border-chart-3/20 bg-chart-3/10 text-chart-3",
    summaryClass: "text-foreground",
  },
  breakdown: {
    label: "拆解步骤",
    hint: "把当前任务压缩成更容易验证的小动作。",
    panelClass: "border-brand/20 bg-surface-2",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim/60 text-brand",
    summaryClass: "text-foreground",
  },
  blocked_help: {
    label: "排查建议",
    hint: "先定位卡点，再决定下一步修改动作。",
    panelClass: "border-gold/20 bg-surface-2",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
  },
  path_guidance: {
    label: "下一步建议",
    hint: "优先把眼前这一步做成，而不是一次铺得太大。",
    panelClass: "border-brand/20 bg-surface-2",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim/60 text-brand",
    summaryClass: "text-foreground",
  },
  review: {
    label: "复盘建议",
    hint: "回看结果，确认做对了什么、还差什么。",
    panelClass: "border-chart-5/20 bg-surface-2",
    iconClass: "text-chart-5",
    chipClass: "border-chart-5/20 bg-chart-5/10 text-chart-5",
    summaryClass: "text-foreground",
  },
  completion: {
    label: "完成反馈",
    hint: "总结当前任务收获，并准备进入下一步。",
    panelClass: "border-emerald-500/20 bg-surface-2",
    iconClass: "text-emerald-600 dark:text-emerald-300",
    chipClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    summaryClass: "text-emerald-700 dark:text-emerald-300",
  },
}

const ASSISTANT_MESSAGE_INTERACTION_META: Record<
  LearningInteractionType,
  AssistantMessageInteractionMeta
> = {
  teaching: {
    label: "学习引导",
    hint: "先看下面这段说明，从最容易验证的一小步开始。",
    panelClass: "border-brand/20 bg-surface-2",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim/60 text-brand",
    summaryClass: "text-foreground",
    sectionClass: CHAT_TONE_CLASS.info.panel,
    orderedBadgeClass: "bg-brand/12 text-brand",
    listIconClass: "text-brand",
  },
  blocked_help: {
    label: "排查建议",
    hint: "先收敛问题来源，再决定要改哪里。",
    panelClass: "border-gold/20 bg-gold-dim/30",
    iconClass: "text-gold",
    chipClass: "border-gold/20 bg-gold-dim text-gold",
    summaryClass: "text-foreground",
    sectionClass: CHAT_TONE_CLASS.warning.panel,
    orderedBadgeClass: "bg-gold-dim text-gold",
    listIconClass: "text-gold",
  },
  task_review: {
    label: "复盘建议",
    hint: "回看当前结果，确认做对了什么、还差什么。",
    panelClass: "border-chart-5/20 bg-surface-2",
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
    panelClass: "border-emerald-500/20 bg-surface-2",
    iconClass: CHAT_TONE_CLASS.success.icon,
    chipClass: CHAT_TONE_CLASS.success.badge,
    summaryClass: CHAT_TONE_CLASS.success.text,
    sectionClass: CHAT_TONE_CLASS.success.panel,
    orderedBadgeClass:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    listIconClass: "text-emerald-600 dark:text-emerald-300",
  },
  path_guidance: {
    label: "下一步建议",
    hint: "优先把当前这一步做实，再判断是否进入后续扩展。",
    panelClass: "border-brand/20 bg-surface-2",
    iconClass: "text-brand",
    chipClass: "border-brand/20 bg-brand-dim/60 text-brand",
    summaryClass: "text-foreground",
    sectionClass: "border-brand/16 bg-brand-dim/35",
    orderedBadgeClass: "bg-brand/12 text-brand",
    listIconClass: "text-brand",
  },
  concept_qa: {
    label: "概念解答",
    hint: "直接回答技术概念问题，不受当前任务范围限制。",
    panelClass: "border-sky-500/20 bg-surface-2",
    iconClass: "text-sky-500",
    chipClass: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    summaryClass: "text-foreground",
    sectionClass: "border-sky-500/16 bg-sky-500/8",
    orderedBadgeClass: "bg-sky-500/12 text-sky-500",
    listIconClass: "text-sky-500",
  },
}

function tokenizeInlineText(text: string): MessageInlineToken[] {
  const tokens: MessageInlineToken[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`\n]+`)/g
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const matched = match[0]
    const start = match.index ?? 0

    if (start > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, start),
      })
    }

    if (matched.startsWith("**") && matched.endsWith("**")) {
      tokens.push({
        type: "strong",
        value: matched.slice(2, -2),
      })
    } else if (matched.startsWith("`") && matched.endsWith("`")) {
      tokens.push({
        type: "code",
        value: matched.slice(1, -1),
      })
    }

    lastIndex = start + matched.length
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    })
  }

  return tokens.filter((token) => token.value.length > 0)
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line.trim())
}

function parseMarkdownTable(text: string): ParsedMarkdownTable | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return null
  }

  const headerLine = lines[0] ?? ""
  const separatorLine = lines[1] ?? ""

  if (!headerLine.includes("|") || !isMarkdownTableSeparator(separatorLine)) {
    return null
  }

  const parseRow = (line: string) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())

  const headers = parseRow(headerLine)
  if (headers.length < 2) {
    return null
  }

  const rows: string[][] = []
  for (const line of lines.slice(2)) {
    if (!line.includes("|")) {
      return null
    }

    const cells = parseRow(line)
    if (cells.length !== headers.length) {
      return null
    }

    rows.push(cells)
  }

  return rows.length > 0 ? { headers, rows } : null
}

type PlainTextTone = "default" | "inverted"

function renderInlineText(
  text: string,
  keyPrefix: string,
  tone: PlainTextTone = "default",
) {
  const strongClass =
    tone === "inverted"
      ? "font-semibold text-white dark:text-black"
      : "font-semibold text-foreground"
  const codeClass =
    tone === "inverted"
      ? "break-words rounded-sm bg-white/15 px-1.5 py-0.5 font-mono text-[0.9em] text-white dark:bg-black/10 dark:text-black sm:px-2 sm:py-1 sm:text-[0.92em]"
      : "break-words rounded-sm bg-black/8 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground dark:bg-white/10 sm:px-2 sm:py-1 sm:text-[0.92em]"

  return tokenizeInlineText(text).map((token, index) => {
    if (token.type === "strong") {
      return (
        <strong key={`${keyPrefix}-strong-${index}`} className={strongClass}>
          {token.value}
        </strong>
      )
    }

    if (token.type === "code") {
      return (
        <code key={`${keyPrefix}-code-${index}`} className={codeClass}>
          {token.value}
        </code>
      )
    }

    return <span key={`${keyPrefix}-text-${index}`}>{token.value}</span>
  })
}

export function renderPlainContent(text: string, tone: PlainTextTone = "default") {
  const paragraphClass =
    tone === "inverted"
      ? "text-white"
      : "text-white"

  return text.split("\n").map((line, index) =>
    line === "" ? (
      <div key={`spacer-${index}`} className="h-2" />
    ) : (
      <p key={`line-${index}`} className={paragraphClass}>
        {renderInlineText(line, `plain-${index}`, tone)}
      </p>
    ),
  )
}

function renderMarkdownParagraph(
  text: string,
  keyPrefix: string,
  className: string,
) {
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(text.trim())) {
    return null
  }

  const headingMatch = text.trim().match(/^(#{2,3})\s+(.+)$/)
  if (headingMatch) {
    return renderMarkdownHeading(text, keyPrefix)
  }

  const table = parseMarkdownTable(text)
  if (!table) {
    return (
      <p key={keyPrefix} className={className}>
        {renderInlineText(text, keyPrefix)}
      </p>
    )
  }

  return (
    <div
      key={keyPrefix}
      className="overflow-x-auto rounded-2xl border border-border/60 bg-background/55"
    >
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/40">
          <tr>
            {table.headers.map((header, headerIndex) => (
              <th
                key={`${keyPrefix}-header-${headerIndex}`}
                className="border-b border-border/60 px-3.5 py-2.5 text-left font-semibold text-foreground"
              >
                {renderInlineText(header, `${keyPrefix}-header-${headerIndex}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${keyPrefix}-row-${rowIndex}`} className="odd:bg-background/40">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${keyPrefix}-cell-${rowIndex}-${cellIndex}`}
                  className="border-b border-border/40 px-3.5 py-2.5 align-top leading-6 text-foreground/90"
                >
                  {renderInlineText(cell, `${keyPrefix}-cell-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderMarkdownHeading(text: string, keyPrefix: string) {
  const trimmed = text.trim()
  const level3Match = trimmed.match(/^###\s+(.+)$/)
  if (level3Match?.[1]) {
    return (
      <p
        key={keyPrefix}
        className="text-[15px] font-semibold leading-7 text-foreground/90"
      >
        {renderInlineText(level3Match[1], keyPrefix)}
      </p>
    )
  }

  const level2Match = trimmed.match(/^##\s+(.+)$/)
  if (level2Match?.[1]) {
    return (
      <p
        key={keyPrefix}
        className="text-[16px] font-semibold leading-7 text-foreground"
      >
        {renderInlineText(level2Match[1], keyPrefix)}
      </p>
    )
  }

  return (
    <p key={keyPrefix} className="text-[15px] font-semibold leading-7 text-foreground">
      {renderInlineText(trimmed, keyPrefix)}
    </p>
  )
}

export function resolveAssistantInteractionType(
  message: Message,
  options?: {
    allowContentHeuristics?: boolean
  },
): LearningInteractionType {
  if (message.structuredContent?.interactionType) {
    return message.structuredContent.interactionType
  }

  if (
    message.kind === "task_feedback" ||
    message.taskPatch?.status === "completed"
  ) {
    return "completion_feedback"
  }

  const title = message.title ?? ""
  const content = message.content

  if (
    title.includes("排查") ||
    message.taskPatch?.status === "blocked" ||
    ((options?.allowContentHeuristics ?? true) &&
      /报错|错误|failed|失败|卡住/i.test(content))
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

export function resolveAssistantMessageVariant(
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
  const meta = ASSISTANT_MESSAGE_INTERACTION_META[interactionType]
  const subtypeMeta =
    interactionType === "teaching" && variant !== "default"
      ? ASSISTANT_MESSAGE_VARIANT_META[variant]
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
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                meta.chipClass,
              )}
            >
              {meta.label}
            </span>
            {subtypeMeta ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  subtypeMeta.chipClass,
                )}
              >
                {subtypeMeta.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            {subtypeMeta ? subtypeMeta.hint : meta.hint}
          </p>
        </div>
      </div>
    </div>
  )
}

function CodeBlockCard({
  code,
  language,
}: {
  code: string
  language: string | null
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="max-w-full min-w-0 overflow-hidden rounded-2xl border border-brand/30 bg-background/70 dark:border-white/10 dark:bg-background/50">
      <div className="flex items-center justify-between gap-3 border-b border-brand/20 px-3.5 py-2 dark:border-white/10">
        <div className="min-w-0 flex-1 truncate font-bold text-[11px] uppercase tracking-[0.12em] text-brand">
          {language ?? "code"}
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCopy()
          }}
          aria-label={copied ? "代码已复制" : "复制代码"}
          title={copied ? "已复制" : "复制代码"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-colors",
            copied
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-border/70 bg-surface-2 text-muted-foreground hover:border-brand/35 hover:text-brand",
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="max-w-full min-w-0 overflow-x-auto px-3 py-2.5 text-[12px] sm:text-[13px] leading-6 text-foreground sm:px-3.5 sm:py-3">
        <code className="block whitespace-pre font-mono">{code}</code>
      </pre>
    </div>
  )
}

export function renderStructuredContent(
  title: string | undefined,
  text: string,
  kind: Message["kind"],
  interactionType: LearningInteractionType,
  variant: AssistantMessageVariant,
  taskPatch?: Message["taskPatch"],
  structuredContent?: Message["structuredContent"],
) {
  const fallbackStructuredContent =
    resolveRenderableStructuredLearningMessageContent({
      title: title ?? null,
      kind,
      interactionType,
      content: text,
      taskPatch: taskPatch ?? null,
      storedContent: structuredContent ?? null,
    }) ?? structuredContent
  const fallbackBlocks = fallbackStructuredContent?.blocks ?? []
  const firstFallbackBlock = fallbackBlocks[0] ?? null
  const fallbackHasSummary = firstFallbackBlock?.type === "paragraph"
  const summaryText =
    fallbackStructuredContent?.summary ??
    (fallbackHasSummary ? firstFallbackBlock.text : null)
  const detailBlocks =
    fallbackStructuredContent?.blocks ??
    (fallbackHasSummary ? fallbackBlocks.slice(1) : fallbackBlocks)
  const interactionMeta = ASSISTANT_MESSAGE_INTERACTION_META[interactionType]
  const sections =
    fallbackStructuredContent?.sections &&
    fallbackStructuredContent.sections.length > 0
      ? fallbackStructuredContent.sections
      : [
          {
            title: null,
            tone:
              interactionType === "completion_feedback"
                ? "success"
                : interactionType === "blocked_help"
                  ? "warning"
                  : interactionType === "path_guidance" ||
                      interactionType === "task_review" ||
                      variant === "example" ||
                      variant === "hint"
                    ? "info"
                    : "default",
            blocks: detailBlocks,
          },
        ]

  return (
    <div className="space-y-3">
      {renderAssistantMessageLead(interactionType, variant)}

      {summaryText ? (
        <div className="rounded-2xl bg-background/70 dark:bg-background/50 px-3.5 py-3 ">
          <p
            className={cn(
              "whitespace-pre-wrap text-sm font-medium leading-6",
              interactionMeta.summaryClass,
            )}
          >
            {renderInlineText(summaryText, "summary")}
          </p>
        </div>
      ) : null}

      {sections
        .filter((section) =>
          shouldRenderStructuredMessageSection({
            blockCount: section.blocks.length,
          }),
        )
        .map((section, sectionIndex) => {
          const sectionToneClass =
            section.tone === "success"
              ? CHAT_TONE_CLASS.success.panel
              : section.tone === "warning"
                ? CHAT_TONE_CLASS.warning.panel
                : section.tone === "info"
                  ? interactionMeta.sectionClass
                  : "border-brand/15 bg-brand/10"

          return (
            <div
              key={`section-${sectionIndex}`}
              className={cn("rounded-2xl border px-3.5 py-3", sectionToneClass)}
            >
              {section.title ? (
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                  {renderInlineText(section.title, `section-title-${sectionIndex}`)}
                </div>
              ) : null}

              <div className="space-y-3">
                {section.blocks.map((block, blockIndex) => {
                  if (block.type === "heading") {
                    return (
                      renderMarkdownHeading(
                        block.text,
                        `heading-${sectionIndex}-${blockIndex}`,
                      )
                    )
                  }

                  if (block.type === "paragraph") {
                    return (
                      renderMarkdownParagraph(
                        block.text,
                        `paragraph-${sectionIndex}-${blockIndex}`,
                        "whitespace-pre-wrap text-sm leading-6 text-foreground/90",
                      )
                    )
                  }

                  if (block.type === "code_block") {
                    return (
                      <CodeBlockCard
                        key={`code-${sectionIndex}-${blockIndex}`}
                        code={block.code}
                        language={block.language}
                      />
                    )
                  }

                  if (block.type === "unordered_list") {
                    return (
                      <div
                        key={`unordered-${sectionIndex}-${blockIndex}`}
                        className="space-y-2 rounded-2xl bg-background/70 dark:bg-background/50 px-3.5 py-3 "
                      >
                        {block.items.map((item, itemIndex) => (
                          <div
                            key={`unordered-item-${sectionIndex}-${blockIndex}-${itemIndex}`}
                            className="flex items-start gap-2.5"
                          >
                            <CheckCircle2
                              className={cn(
                                "mt-1 h-4 w-4 shrink-0",
                                kind === "task_feedback" ||
                                  interactionType === "completion_feedback"
                                  ? "text-emerald-600 dark:text-emerald-300"
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
                      className="space-y-2 rounded-2xl bg-background/70 dark:bg-background/50 px-3.5 py-3 "
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

export function parseStructuredContentPayload(payload: Record<string, unknown>) {
  return parseStoredStructuredLearningMessageContent(payload.structuredContent ?? null)
}

export function resolveTaskStateFromPatch(
  taskPatch: LearningTaskPatch | null | undefined,
  fallbackState: "pending" | "in_progress" | "blocked" | "completed",
) {
  if (!taskPatch || taskPatch.status === "completed") {
    return fallbackState
  }

  return taskPatch.status
}
