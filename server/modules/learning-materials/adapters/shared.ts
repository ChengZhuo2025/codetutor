import "server-only"

import { MATERIAL_PLAN_FETCH_TIMEOUT_MS, MATERIAL_PLAN_MAX_TEXT_CHARS } from "../constants.ts"
import { materialFetchFailed } from "../errors.ts"

function isPrivateOrInternalHost(hostname: string) {
  const lower = hostname.toLowerCase()

  if (["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(lower)) {
    return true
  }

  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number) as [unknown, number, number, number, number]
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 127) return true
    if (a === 0) return true
  }

  if (lower.includes("metadata.google.internal")) return true

  return false
}

const domainFetchTimestamps = new Map<string, number[]>()
const DOMAIN_RATE_LIMIT_WINDOW_MS = 1_000
const DOMAIN_RATE_LIMIT_MAX_REQUESTS = 3

function assertDomainRateLimit(hostname: string) {
  const now = Date.now()
  const timestamps = domainFetchTimestamps.get(hostname) ?? []
  const recent = timestamps.filter((ts) => now - ts < DOMAIN_RATE_LIMIT_WINDOW_MS)

  if (recent.length >= DOMAIN_RATE_LIMIT_MAX_REQUESTS) {
    throw materialFetchFailed("请求过于频繁，请稍后重试。")
  }

  recent.push(now)
  domainFetchTimestamps.set(hostname, recent)

  if (domainFetchTimestamps.size > 500) {
    const oldest = [...domainFetchTimestamps.entries()]
      .sort(([, a], [, b]) => a[0]! - b[0]!)
      .slice(0, 50)
      .map(([key]) => key)
    for (const key of oldest) {
      domainFetchTimestamps.delete(key)
    }
  }
}

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
    const resolved = new URL(normalized, baseUrl)
    if (isPrivateOrInternalHost(resolved.hostname)) {
      return null
    }
    return resolved.toString()
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

export async function fetchPublicPageBasics(
  rawUrl: string,
  options?: {
    headers?: HeadersInit
  },
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MATERIAL_PLAN_FETCH_TIMEOUT_MS)

  try {
    const originalHostname = new URL(rawUrl).hostname.toLowerCase()
    assertDomainRateLimit(originalHostname)

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CodeTutorMaterialBot/1.0 (+https://example.com)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        ...(options?.headers ?? {}),
      },
      redirect: "follow",
    })

    const finalUrl = response.url || rawUrl
    const finalHostname = new URL(finalUrl).hostname.toLowerCase()

    if (isPrivateOrInternalHost(finalHostname)) {
      throw materialFetchFailed("链接重定向到不允许的目标。")
    }

    if (!response.ok) {
      throw materialFetchFailed(`页面返回状态 ${response.status}。`)
    }

    const html = await response.text()
    const visibleText = stripTags(html).replace(/\s+/g, " ").trim()
    const text = visibleText.slice(0, MATERIAL_PLAN_MAX_TEXT_CHARS)

    return {
      canonicalUrl: finalUrl,
      rawHtml: html,
      title: extractTitle(html),
      description: matchMeta(html, "og:description") ?? matchMeta(html, "description"),
      coverImageUrl: resolveAssetUrl(matchMeta(html, "og:image"), finalUrl),
      imageUrls: matchMetaAll(html, "og:image")
        .map((url) => resolveAssetUrl(url, finalUrl))
        .filter((url): url is string => Boolean(url)),
      videoUrl: resolveAssetUrl(
        matchMeta(html, "og:video:url")
          ?? matchMeta(html, "og:video")
          ?? matchMeta(html, "twitter:player:stream"),
        finalUrl,
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
