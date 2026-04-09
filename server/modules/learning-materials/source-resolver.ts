import "server-only"

import { materialUnsupportedSource } from "./errors.ts"
import { bilibiliMaterialSourceAdapter } from "./adapters/bilibili.ts"
import { douyinMaterialSourceAdapter } from "./adapters/douyin.ts"
import { htmlMaterialSourceAdapter } from "./adapters/html.ts"
import { xiaohongshuMaterialSourceAdapter } from "./adapters/xiaohongshu.ts"

export type AdapterFetchResult = {
  canonicalUrl: string
  sourceType: "article" | "video" | "image_post"
  title: string | null
  description: string | null
  authorName: string | null
  coverImageUrl: string | null
  subtitleTracks: Array<{ language: string | null; text: string }>
  mediaAssets: Array<{ kind: string; url: string }>
  rawTextBlocks: string[]
  warnings: string[]
}

export type MaterialSourceAdapter = {
  sourceCode: "html" | "douyin" | "xiaohongshu" | "bilibili"
  supports: (url: URL) => boolean
  fetch: (rawUrl: string) => Promise<AdapterFetchResult>
}

const adapters: MaterialSourceAdapter[] = [
  htmlMaterialSourceAdapter,
  douyinMaterialSourceAdapter,
  xiaohongshuMaterialSourceAdapter,
  bilibiliMaterialSourceAdapter,
]

export function resolveMaterialSourceAdapter(rawUrl: string) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw materialUnsupportedSource("链接格式不正确。")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw materialUnsupportedSource("链接格式不正确。")
  }

  const adapter = adapters.find((item) => item.supports(url)) ?? null
  if (!adapter) {
    throw materialUnsupportedSource(
      "当前仅支持 developer.mozilla.org、nextjs.org、web.dev，以及公开的抖音、小红书、B 站教程链接。",
    )
  }

  return adapter
}
