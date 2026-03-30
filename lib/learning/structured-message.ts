import type { LearningTaskPatch } from "../api/contracts/learning.ts"

export type StructuredLearningMessageVariant =
  | "default"
  | "hint"
  | "example"
  | "breakdown"
  | "blocked_help"
  | "path_guidance"
  | "review"
  | "completion"

export type StructuredLearningMessageBlock =
  | {
      type: "heading"
      text: string
    }
  | {
      type: "paragraph"
      text: string
    }
  | {
      type: "unordered_list"
      items: string[]
    }
  | {
      type: "ordered_list"
      items: string[]
    }

export type StructuredLearningMessageContent = {
  variant: StructuredLearningMessageVariant
  summary: string | null
  blocks: StructuredLearningMessageBlock[]
}

type StructuredMessageInput = {
  title?: string | null
  kind: "coach" | "task_feedback" | "user_input" | "system_goal"
  content: string
  taskPatch?: LearningTaskPatch | null
}

function normalizeText(value: string) {
  return value.trim()
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function parseBlocksFromText(text: string): {
  summary: string | null
  blocks: StructuredLearningMessageBlock[]
} {
  const lines = text.split("\n")
  const blocks: StructuredLearningMessageBlock[] = []
  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return
    }

    const paragraph = paragraphBuffer.join(" ").trim()
    if (paragraph) {
      blocks.push({
        type: "paragraph",
        text: paragraph,
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

  const firstBlock = blocks[0] ?? null
  if (firstBlock?.type !== "paragraph") {
    return {
      summary: null,
      blocks,
    }
  }

  return {
    summary: firstBlock.text,
    blocks: blocks.slice(1),
  }
}

export function resolveStructuredLearningMessageVariant(
  input: StructuredMessageInput,
): StructuredLearningMessageVariant {
  if (input.kind === "task_feedback" || input.taskPatch?.status === "completed") {
    return "completion"
  }

  const title = input.title?.trim() ?? ""
  const content = input.content

  if (
    title.includes("排查")
    || input.taskPatch?.status === "blocked"
    || /报错|错误|failed|失败|卡住/i.test(content)
  ) {
    return "blocked_help"
  }

  if (title.includes("最小示例") || title.includes("示例")) {
    return "example"
  }

  if (title.includes("拆小") || title.includes("拆细")) {
    return "breakdown"
  }

  if (title.includes("下一步")) {
    return "path_guidance"
  }

  if (title.includes("复盘")) {
    return "review"
  }

  if (title.includes("提示")) {
    return "hint"
  }

  return "default"
}

export function buildStructuredLearningMessageContent(
  input: StructuredMessageInput,
): StructuredLearningMessageContent | null {
  const content = normalizeText(input.content)
  if (!content) {
    return null
  }

  const parsed = parseBlocksFromText(content)

  return {
    variant: resolveStructuredLearningMessageVariant({
      ...input,
      content,
    }),
    summary: parsed.summary,
    blocks: parsed.blocks,
  }
}

export function parseStoredStructuredLearningMessageContent(
  value: unknown,
): StructuredLearningMessageContent | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const variant = record.variant
  const summary = record.summary
  const blocks = record.blocks

  if (
    variant !== "default"
    && variant !== "hint"
    && variant !== "example"
    && variant !== "breakdown"
    && variant !== "blocked_help"
    && variant !== "path_guidance"
    && variant !== "review"
    && variant !== "completion"
  ) {
    return null
  }

  if (!(summary === null || isNonEmptyString(summary))) {
    return null
  }

  if (!Array.isArray(blocks)) {
    return null
  }

  const normalizedBlocks = blocks
    .map((block) => {
      if (!block || typeof block !== "object") {
        return null
      }

      const item = block as Record<string, unknown>
      if (item.type === "heading" && isNonEmptyString(item.text)) {
        return {
          type: "heading" as const,
          text: item.text.trim(),
        }
      }

      if (item.type === "paragraph" && isNonEmptyString(item.text)) {
        return {
          type: "paragraph" as const,
          text: item.text.trim(),
        }
      }

      if (item.type === "unordered_list" && isStringArray(item.items)) {
        return {
          type: "unordered_list" as const,
          items: item.items.map((entry) => entry.trim()).filter(Boolean),
        }
      }

      if (item.type === "ordered_list" && isStringArray(item.items)) {
        return {
          type: "ordered_list" as const,
          items: item.items.map((entry) => entry.trim()).filter(Boolean),
        }
      }

      return null
    })
    .filter((block): block is StructuredLearningMessageBlock => Boolean(block))

  return {
    variant,
    summary: summary === null ? null : summary.trim(),
    blocks: normalizedBlocks,
  }
}
