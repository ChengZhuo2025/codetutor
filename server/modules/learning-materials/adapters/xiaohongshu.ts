import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import { materialFetchFailed } from "../errors.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

const XIAOHONGSHU_DOMAIN = "xiaohongshu.com"
const XIAOHONGSHU_SHORTLINK_DOMAIN = "xhslink.com"

function getFriendlyXiaohongshuAccessGuidance() {
  return "小红书链接未返回可公开访问的详情内容。请打开单条公开笔记详情页后复制链接重试；若页面需要登录、仅粉丝可见或已下线，当前无法生成学习计划。"
}

function isXiaohongshuHostname(hostname: string) {
  const lower = hostname.toLowerCase()
  return lower === XIAOHONGSHU_DOMAIN
    || lower.endsWith(`.${XIAOHONGSHU_DOMAIN}`)
    || lower === XIAOHONGSHU_SHORTLINK_DOMAIN
    || lower.endsWith(`.${XIAOHONGSHU_SHORTLINK_DOMAIN}`)
}

function isLikelyXiaohongshuBlockedShell(rawHtml: string) {
  if (/<body[^>]*>\s*<\/body>/i.test(rawHtml)) {
    return true
  }

  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch?.[1]?.trim() ?? ""
  if (title === "小红书" && rawHtml.length < 8000) {
    return true
  }

  const loginIndicators = [
    /class=["'][^"']*login[^"']*["']/i,
    /class=["'][^"']*captcha[^"']*["']/i,
    /id=["']login[^"']*["']/i,
    /请登录/i,
    /验证码/,
    /sliderCaptcha/i,
  ]
  const matchCount = loginIndicators.filter((pattern) => pattern.test(rawHtml)).length
  if (matchCount >= 3) {
    return true
  }

  return false
}

function isVideoPost(rawHtml: string, basics: { videoUrl: string | null }) {
  if (basics.videoUrl) {
    return true
  }

  const videoIndicators = [
    /og:video/i,
    /video:url/i,
    /property=["']og:type["']\s+content=["']video/i,
    /class=["'][^"']*video[^"']*["']/i,
    /class=["'][^"']*player[^"']*["']/i,
  ]
  return videoIndicators.some((pattern) => pattern.test(rawHtml.slice(0, 10000)))
}

export const xiaohongshuMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "xiaohongshu",
  supports(url) {
    return isXiaohongshuHostname(url.hostname)
  },
  async fetch(rawUrl) {
    const basics = await fetchPublicPageBasics(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    })

    if (isLikelyXiaohongshuBlockedShell(basics.rawHtml)) {
      throw materialFetchFailed(getFriendlyXiaohongshuAccessGuidance())
    }

    const sourceType = isVideoPost(basics.rawHtml, basics) ? "video" : "image_post"
    const mediaAssets = [
      ...(basics.imageUrls.map((url) => ({ kind: "image", url }))),
      ...(basics.coverImageUrl ? [{ kind: "cover_image", url: basics.coverImageUrl }] : []),
    ]
    return {
      canonicalUrl: basics.canonicalUrl,
      sourceType,
      title: basics.title,
      description: basics.description,
      authorName: null,
      coverImageUrl: basics.coverImageUrl,
      subtitleTracks: [],
      mediaAssets,
      rawTextBlocks: basics.text ? [basics.text] : [],
      warnings: basics.text.length < 400 ? ["公开页正文较少，已保留可见描述与元数据。"] : [],
    }
  },
}
