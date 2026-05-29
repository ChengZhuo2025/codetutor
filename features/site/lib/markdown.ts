const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])

export type MarkdownBlock =
  | {
      type: "heading"
      level: 2 | 3
      text: string
    }
  | {
      type: "ordered-list" | "unordered-list"
      items: string[]
    }
  | {
      type: "paragraph"
      text: string
    }

export function escapeMarkdownHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function sanitizeMarkdownHref(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? trimmed : null
  } catch {
    return null
  }
}

export function renderMarkdownInlineHtml(text: string): string {
  const linkTokens: string[] = []
  const protectedText = text.replace(
    /\[([^\]\n]+)\]\(((?:[^()\n]|\([^)\n]*\))+)\)/g,
    (_match, label: string, href: string) => {
      const safeHref = sanitizeMarkdownHref(href)
      const html = safeHref
        ? `<a href="${escapeMarkdownHtml(safeHref)}" class="underline decoration-muted-foreground/40 underline-offset-2" target="_blank" rel="noopener noreferrer">${escapeMarkdownHtml(label)}</a>`
        : escapeMarkdownHtml(label)
      const token = `\u0000LINK_${linkTokens.length}\u0000`
      linkTokens.push(html)
      return token
    },
  )

  let html = escapeMarkdownHtml(protectedText)

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>")
  html = html.replace(/`([^`\n]+?)`/g, "<code class='rounded bg-muted px-1 py-0.5 text-xs font-mono'>$1</code>")

  html = html.replace(/\u0000LINK_(\d+)\u0000/g, (_match, index: string) => {
    return linkTokens[Number(index)] ?? ""
  })

  return html
}

function flushParagraph(lines: string[], blocks: MarkdownBlock[]) {
  if (lines.length === 0) return
  blocks.push({
    type: "paragraph",
    text: lines.join("\n").trim(),
  })
  lines.length = 0
}

function flushList(
  list: { type: "ordered-list" | "unordered-list"; items: string[] } | null,
  blocks: MarkdownBlock[],
) {
  if (!list || list.items.length === 0) return null
  blocks.push({
    type: list.type,
    items: list.items,
  })
  return null
}

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const paragraphLines: string[] = []
  let currentList: { type: "ordered-list" | "unordered-list"; items: string[] } | null = null

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph(paragraphLines, blocks)
      currentList = flushList(currentList, blocks)
      continue
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph(paragraphLines, blocks)
      currentList = flushList(currentList, blocks)
      blocks.push({
        type: "heading",
        level: heading[1]?.length === 3 ? 3 : 2,
        text: heading[2]?.trim() ?? "",
      })
      continue
    }

    const orderedListItem = /^\d+\.\s+(.+)$/.exec(line)
    if (orderedListItem) {
      flushParagraph(paragraphLines, blocks)
      if (currentList?.type !== "ordered-list") {
        currentList = flushList(currentList, blocks)
        currentList = { type: "ordered-list", items: [] }
      }
      currentList.items.push(orderedListItem[1]?.trim() ?? "")
      continue
    }

    const unorderedListItem = /^[-*]\s+(.+)$/.exec(line)
    if (unorderedListItem) {
      flushParagraph(paragraphLines, blocks)
      if (currentList?.type !== "unordered-list") {
        currentList = flushList(currentList, blocks)
        currentList = { type: "unordered-list", items: [] }
      }
      currentList.items.push(unorderedListItem[1]?.trim() ?? "")
      continue
    }

    currentList = flushList(currentList, blocks)
    paragraphLines.push(line)
  }

  flushParagraph(paragraphLines, blocks)
  flushList(currentList, blocks)
  return blocks
}
