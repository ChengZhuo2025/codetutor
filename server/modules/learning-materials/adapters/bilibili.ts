import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

export const bilibiliMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "bilibili",
  supports(url) {
    const hostname = url.hostname.toLowerCase()
    return hostname.includes("bilibili.com") || hostname.includes("b23.tv")
  },
  async fetch(rawUrl) {
    const basics = await fetchPublicPageBasics(rawUrl)
    return {
      canonicalUrl: basics.canonicalUrl,
      sourceType: "video",
      title: basics.title,
      description: basics.description,
      authorName: null,
      coverImageUrl: basics.coverImageUrl,
      subtitleTracks: [],
      mediaAssets: basics.coverImageUrl ? [{ kind: "cover_image", url: basics.coverImageUrl }] : [],
      rawTextBlocks: basics.text ? [basics.text] : [],
      warnings: basics.text.length < 400 ? ["未拿到稳定字幕，先使用公开简介与可见文本。"] : [],
    }
  },
}
