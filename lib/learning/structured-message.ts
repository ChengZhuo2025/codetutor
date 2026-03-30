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

export type StructuredLearningMessageSectionTone =
  | "default"
  | "info"
  | "success"
  | "warning"

export type StructuredLearningMessageSection = {
  title: string | null
  tone: StructuredLearningMessageSectionTone
  blocks: StructuredLearningMessageBlock[]
}

export type StructuredLearningMessageActionTone =
  | "primary"
  | "secondary"
  | "warning"
  | "success"

export type StructuredLearningMessageAction = {
  label: string
  prompt: string
  tone: StructuredLearningMessageActionTone
}

export type StructuredLearningMessageContent = {
  variant: StructuredLearningMessageVariant
  summary: string | null
  blocks: StructuredLearningMessageBlock[]
  sections: StructuredLearningMessageSection[]
  actions: StructuredLearningMessageAction[]
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

function buildStructuredSections(
  variant: StructuredLearningMessageVariant,
  blocks: StructuredLearningMessageBlock[],
): StructuredLearningMessageSection[] {
  if (blocks.length === 0) {
    return []
  }

  const tone =
    variant === "completion"
      ? "success"
      : variant === "blocked_help"
        ? "warning"
        : variant === "example" || variant === "hint"
          ? "info"
          : "default"

  const firstHeading = blocks[0]?.type === "heading" ? blocks[0].text : null
  const contentBlocks = firstHeading ? blocks.slice(1) : blocks

  return [
    {
      title: firstHeading,
      tone,
      blocks: contentBlocks,
    },
  ]
}

function buildStructuredActions(input: {
  variant: StructuredLearningMessageVariant
  taskPatch?: LearningTaskPatch | null
}): StructuredLearningMessageAction[] {
  if (input.taskPatch?.status === "blocked") {
    return [
      {
        label: "补充报错信息",
        prompt: input.taskPatch.suggestedNextAction,
        tone: "warning",
      },
    ]
  }

  if (input.variant === "completion" || input.taskPatch?.status === "completed") {
    return [
      {
        label: "继续下一步",
        prompt: "请根据我刚完成的结果，告诉我当前最值得做的下一步。",
        tone: "success",
      },
    ]
  }

  if (input.variant === "example") {
    return [
      {
        label: "给我最小示例",
        prompt: "请给我一个最小可运行示例，并说明我该先验证什么。",
        tone: "secondary",
      },
    ]
  }

  if (input.variant === "breakdown") {
    return [
      {
        label: "再拆细一点",
        prompt: "请把刚才这一步继续拆细，直到我可以立即执行第一个动作。",
        tone: "secondary",
      },
    ]
  }

  if (input.variant === "review") {
    return [
      {
        label: "帮我复盘结果",
        prompt: "请根据我刚才的结果，帮我做一次简短复盘。",
        tone: "secondary",
      },
    ]
  }

  return [
    {
      label: "继续当前关卡",
      prompt: "请根据当前上下文告诉我接下来最小的一步应该做什么。",
      tone: "primary",
    },
  ]
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
  const variant = resolveStructuredLearningMessageVariant({
    ...input,
    content,
  })

  return {
    variant,
    summary: parsed.summary,
    blocks: parsed.blocks,
    sections: buildStructuredSections(variant, parsed.blocks),
    actions: buildStructuredActions({
      variant,
      taskPatch: input.taskPatch,
    }),
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
  const sections = record.sections
  const actions = record.actions

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

  const normalizedSections =
    Array.isArray(sections)
      ? sections
          .map((section) => {
            if (!section || typeof section !== "object") {
              return null
            }

            const item = section as Record<string, unknown>
            if (
              !(item.title === null || isNonEmptyString(item.title))
              || (item.tone !== "default"
                && item.tone !== "info"
                && item.tone !== "success"
                && item.tone !== "warning")
              || !Array.isArray(item.blocks)
            ) {
              return null
            }

            const sectionBlocks = item.blocks
              .map((block) => {
                if (!block || typeof block !== "object") {
                  return null
                }

                const blockRecord = block as Record<string, unknown>
                if (blockRecord.type === "heading" && isNonEmptyString(blockRecord.text)) {
                  return { type: "heading" as const, text: blockRecord.text.trim() }
                }
                if (blockRecord.type === "paragraph" && isNonEmptyString(blockRecord.text)) {
                  return { type: "paragraph" as const, text: blockRecord.text.trim() }
                }
                if (blockRecord.type === "unordered_list" && isStringArray(blockRecord.items)) {
                  return {
                    type: "unordered_list" as const,
                    items: blockRecord.items.map((entry) => entry.trim()).filter(Boolean),
                  }
                }
                if (blockRecord.type === "ordered_list" && isStringArray(blockRecord.items)) {
                  return {
                    type: "ordered_list" as const,
                    items: blockRecord.items.map((entry) => entry.trim()).filter(Boolean),
                  }
                }
                return null
              })
              .filter((block): block is StructuredLearningMessageBlock => Boolean(block))

            return {
              title: item.title === null ? null : item.title.trim(),
              tone: item.tone,
              blocks: sectionBlocks,
            } satisfies StructuredLearningMessageSection
          })
          .filter((section): section is StructuredLearningMessageSection => Boolean(section))
      : buildStructuredSections(variant, normalizedBlocks)

  const normalizedActions =
    Array.isArray(actions)
      ? actions
          .map((action) => {
            if (!action || typeof action !== "object") {
              return null
            }

            const item = action as Record<string, unknown>
            if (
              !isNonEmptyString(item.label)
              || !isNonEmptyString(item.prompt)
              || (item.tone !== "primary"
                && item.tone !== "secondary"
                && item.tone !== "warning"
                && item.tone !== "success")
            ) {
              return null
            }

            return {
              label: item.label.trim(),
              prompt: item.prompt.trim(),
              tone: item.tone,
            } satisfies StructuredLearningMessageAction
          })
          .filter((action): action is StructuredLearningMessageAction => Boolean(action))
      : buildStructuredActions({
          variant,
        })

  return {
    variant,
    summary: summary === null ? null : summary.trim(),
    blocks: normalizedBlocks,
    sections: normalizedSections,
    actions: normalizedActions,
  }
}
