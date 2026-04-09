import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

export const xiaohongshuMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "xiaohongshu",
  supports(url) {
    const hostname = url.hostname.toLowerCase()
    return hostname.includes("xiaohongshu.com") || hostname.includes("xhslink.com")
  },
  async fetch(rawUrl) {
    const basics = await fetchPublicPageBasics(rawUrl)
    return {
      canonicalUrl: basics.canonicalUrl,
      sourceType: "image_post",
      title: basics.title,
      description: basics.description,
      authorName: null,
      coverImageUrl: basics.coverImageUrl,
      subtitleTracks: [],
      mediaAssets: basics.coverImageUrl ? [{ kind: "cover_image", url: basics.coverImageUrl }] : [],
      rawTextBlocks: basics.text ? [basics.text] : [],
      warnings: basics.text.length < 400 ? ["公开页正文较少，已保留可见描述与元数据。"] : [],
    }
  },
}
