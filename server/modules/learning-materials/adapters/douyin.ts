import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

export const douyinMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "douyin",
  supports(url) {
    return url.hostname.toLowerCase().includes("douyin.com")
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
      warnings: basics.text.length < 400 ? ["公开页可提取文本较少，可能只能生成试点计划。"] : [],
    }
  },
}
