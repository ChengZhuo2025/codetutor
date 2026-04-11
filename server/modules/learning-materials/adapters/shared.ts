import "server-only"

import { MATERIAL_PLAN_FETCH_TIMEOUT_MS, MATERIAL_PLAN_MAX_TEXT_CHARS } from "../constants.ts"
import { materialFetchFailed } from "../errors.ts"

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
}

function resolveAssetUrl(value: string | null, baseUrl: string) {
  if (!value) {
    return null
  }

  const normalized = decodeHtmlEntities(value.trim())
  if (!normalized) {
    return null
  }

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return normalized.startsWith("//") ? `https:${normalized}` : normalized
  }
}

function matchMeta(html: string, name: string) {
  const propertyMatch = html.match(
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
  )
  if (propertyMatch?.[1]) {
    return decodeHtmlEntities(propertyMatch[1].trim())
  }

  const nameMatch = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
  )
  return nameMatch?.[1] ? decodeHtmlEntities(nameMatch[1].trim()) : null
}

function matchMetaAll(html: string, name: string) {
  const matches = [
    ...html.matchAll(
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "gi"),
    ),
    ...html.matchAll(
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "gi"),
    ),
  ]

  return [
    ...new Set(
      matches
        .map((match) => match[1] ? decodeHtmlEntities(match[1].trim()) : null)
        .filter(Boolean),
    ),
  ]
}

function extractTitle(html: string) {
  return (
    matchMeta(html, "og:title")
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim()
    ?? null
  )
}

export async function fetchPublicPageBasics(rawUrl: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MATERIAL_PLAN_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CodeTutorMaterialBot/1.0 (+https://example.com)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      throw materialFetchFailed(`页面返回状态 ${response.status}。`)
    }

    const html = await response.text()
    const visibleText = stripTags(html).replace(/\s+/g, " ").trim()
    const text = visibleText.slice(0, MATERIAL_PLAN_MAX_TEXT_CHARS)

    return {
      canonicalUrl: response.url || rawUrl,
      rawHtml: html,
      title: extractTitle(html),
      description: matchMeta(html, "og:description") ?? matchMeta(html, "description"),
      coverImageUrl: resolveAssetUrl(matchMeta(html, "og:image"), response.url || rawUrl),
      imageUrls: matchMetaAll(html, "og:image")
        .map((url) => resolveAssetUrl(url, response.url || rawUrl))
        .filter((url): url is string => Boolean(url)),
      videoUrl: resolveAssetUrl(
        matchMeta(html, "og:video:url")
          ?? matchMeta(html, "og:video")
          ?? matchMeta(html, "twitter:player:stream"),
        response.url || rawUrl,
      ),
      text,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw materialFetchFailed("抓取超时。")
    }
    if (error instanceof Error && error.name === "MaterialPlanError") {
      throw error
    }
    throw materialFetchFailed()
  } finally {
    clearTimeout(timer)
  }
}
