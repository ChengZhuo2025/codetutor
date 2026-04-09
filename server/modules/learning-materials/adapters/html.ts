import "server-only"

import { fetchArticleText } from "../extractors/article.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

const HTML_HOSTS = new Set([
  "developer.mozilla.org",
  "nextjs.org",
  "web.dev",
])

export const htmlMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "html",
  supports(url) {
    return HTML_HOSTS.has(url.hostname.toLowerCase())
  },
  async fetch(rawUrl) {
    const { title, text } = await fetchArticleText(rawUrl)
    return {
      canonicalUrl: rawUrl,
      sourceType: "article",
      title,
      description: text.slice(0, 240) || null,
      authorName: null,
      coverImageUrl: null,
      subtitleTracks: [],
      mediaAssets: [],
      rawTextBlocks: [text],
      warnings: [],
    }
  },
}
