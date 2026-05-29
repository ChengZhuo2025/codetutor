const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])

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
