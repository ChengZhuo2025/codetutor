import "server-only"

import { fetchPublicPageBasics } from "./shared.ts"
import type { MaterialSourceAdapter } from "../source-resolver.ts"

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function matchInlineJson(html: string, pattern: RegExp) {
  return html.match(pattern)?.[1] ?? null
}

function matchWindowJsonAssignment(html: string, variableName: "__INITIAL_STATE__" | "__playinfo__") {
  const marker = `window.${variableName}=`
  const markerIndex = html.indexOf(marker)
  if (markerIndex < 0) {
    return null
  }

  const objectStart = html.indexOf("{", markerIndex + marker.length)
  if (objectStart < 0) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = objectStart; index < html.length; index += 1) {
    const char = html[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
      continue
    }

    if (char === "{") {
      depth += 1
      continue
    }

    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return html.slice(objectStart, index + 1)
      }
    }
  }

  return null
}

function pickDashUrl(
  items: Array<{ baseUrl?: string; base_url?: string }> | undefined,
) {
  return items?.find((item) => item.baseUrl || item.base_url)?.baseUrl
    ?? items?.find((item) => item.baseUrl || item.base_url)?.base_url
    ?? null
}

export const bilibiliMaterialSourceAdapter: MaterialSourceAdapter = {
  sourceCode: "bilibili",
  supports(url) {
    const hostname = url.hostname.toLowerCase()
    return hostname.includes("bilibili.com") || hostname.includes("b23.tv")
  },
  async fetch(rawUrl) {
    const basics = await fetchPublicPageBasics(rawUrl)
    const initialState = safeJsonParse<{
      videoData?: {
        title?: string
        desc?: string
        owner?: {
          name?: string
        }
        pic?: string
      }
    }>(
      matchWindowJsonAssignment(basics.rawHtml, "__INITIAL_STATE__")
        ?? matchInlineJson(basics.rawHtml, /window\.__INITIAL_STATE__=(\{[\s\S]*?\});\(function\(/),
    )
    const playinfo = safeJsonParse<{
      data?: {
        dash?: {
          audio?: Array<{ baseUrl?: string; base_url?: string }>
          video?: Array<{ baseUrl?: string; base_url?: string }>
        }
      }
    }>(
      matchWindowJsonAssignment(basics.rawHtml, "__playinfo__")
        ?? matchInlineJson(basics.rawHtml, /window\.__playinfo__=(\{[\s\S]*?\})<\/script>/),
    )
    const title = initialState?.videoData?.title ?? basics.title
    const description = initialState?.videoData?.desc?.trim() || basics.description
    const authorName = initialState?.videoData?.owner?.name ?? null
    const coverImageUrl = initialState?.videoData?.pic ?? basics.coverImageUrl
    const audioUrl = pickDashUrl(playinfo?.data?.dash?.audio)
    const videoUrl = pickDashUrl(playinfo?.data?.dash?.video) ?? basics.videoUrl
    const mediaAssets = [
      ...(audioUrl ? [{ kind: "audio", url: audioUrl }] : []),
      ...(videoUrl ? [{ kind: "video", url: videoUrl }] : []),
      ...(coverImageUrl ? [{ kind: "cover_image", url: coverImageUrl }] : []),
    ]
    const rawTextBlocks = [...new Set(
      [title, description, basics.text]
        .map((item) => item?.trim())
        .filter(Boolean) as string[],
    )]
    const rawTextLength = rawTextBlocks.join("\n").length

    return {
      canonicalUrl: basics.canonicalUrl,
      sourceType: "video",
      title,
      description,
      authorName,
      coverImageUrl,
      subtitleTracks: [],
      mediaAssets,
      rawTextBlocks,
      warnings:
        rawTextLength < 400
          ? ["未拿到稳定字幕，先使用公开标题与简介，必要时继续升级到 ASR。"]
          : [],
    }
  },
}
