import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import { materialFetchFailed } from "../errors.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

const DOUYIN_DOMAIN = "douyin.com"

function getFriendlyDouyinLinkGuidance() {
  return "请打开抖音单条公开视频详情页后复制链接重试，不要直接使用个人页、收藏页或合集页链接。"
}

function getFriendlyDouyinAccessGuidance() {
  return "抖音链接未返回可公开访问的详情内容。请打开单条公开视频详情页后复制链接重试；若页面需要登录、仅粉丝可见或已下线，当前无法生成学习计划。"
}

function isDouyinHostname(hostname: string) {
  const lower = hostname.toLowerCase()
  return lower === DOUYIN_DOMAIN || lower.endsWith(`.${DOUYIN_DOMAIN}`)
}

function normalizeDouyinPublicUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)

    if (!isDouyinHostname(url.hostname)) {
      throw materialFetchFailed(getFriendlyDouyinLinkGuidance())
    }

    const modalId = url.searchParams.get("modal_id")?.trim()

    if (modalId) {
      if (!/^\d+$/.test(modalId)) {
        throw materialFetchFailed(getFriendlyDouyinLinkGuidance())
      }
      return `https://www.douyin.com/video/${modalId}?source=Baiduspider`
    }

    if (/^\/video\/\d+$/i.test(url.pathname)) {
      url.searchParams.set("source", "Baiduspider")
      return url.toString()
    }

    throw materialFetchFailed(getFriendlyDouyinLinkGuidance())
  } catch (error) {
    if (error instanceof Error && error.name === "MaterialPlanError") {
      throw error
    }
    throw materialFetchFailed(getFriendlyDouyinLinkGuidance())
  }
}

function isLikelyDouyinLoginShell(rawHtml: string) {
  return rawHtml.includes("_$jsvmprt")
    && /<body>\s*<\/body>/i.test(rawHtml)
}

export const douyinMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "douyin",
  supports(url) {
    return isDouyinHostname(url.hostname)
  },
  async fetch(rawUrl) {
    const basics = await fetchPublicPageBasics(normalizeDouyinPublicUrl(rawUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    })

    if (isLikelyDouyinLoginShell(basics.rawHtml)) {
      throw materialFetchFailed(getFriendlyDouyinAccessGuidance())
    }

    const mediaAssets = [
      ...(basics.videoUrl ? [{ kind: "video", url: basics.videoUrl }] : []),
      ...(basics.coverImageUrl ? [{ kind: "cover_image", url: basics.coverImageUrl }] : []),
    ]
    return {
      canonicalUrl: basics.canonicalUrl,
      sourceType: "video",
      title: basics.title,
      description: basics.description,
      authorName: null,
      coverImageUrl: basics.coverImageUrl,
      subtitleTracks: [],
      mediaAssets,
      rawTextBlocks: basics.text ? [basics.text] : [],
      warnings: basics.text.length < 400 ? ["公开页可提取文本较少，可能只能生成试点计划。"] : [],
    }
  },
}
