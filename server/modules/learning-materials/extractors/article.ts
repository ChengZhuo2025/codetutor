import "server-only"

import { MATERIAL_PLAN_FETCH_TIMEOUT_MS, MATERIAL_PLAN_MAX_TEXT_CHARS } from "../constants.ts"
import { materialFetchFailed } from "../errors.ts"

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
}

function pickArticleHtml(html: string) {
  const main = html.match(/<main[\s\S]*?<\/main>/i)
  if (main) {
    return main[0]
  }
  const article = html.match(/<article[\s\S]*?<\/article>/i)
  if (article) {
    return article[0]
  }
  return html
}

function extractTitle(html: string) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (og?.[1]) {
    return og[1].trim()
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return t?.[1]?.replace(/\s+/g, " ").trim() ?? null
}

export type ArticleExtraction = {
  title: string | null
  text: string
}

export async function fetchArticleText(url: string): Promise<ArticleExtraction> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MATERIAL_PLAN_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
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

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw materialFetchFailed("页面不是可解析的 HTML。")
    }

    const html = await response.text()
    const title = extractTitle(html)
    const slice = pickArticleHtml(html)
    let text = stripTags(slice).replace(/\s+/g, " ").trim()

    if (text.length > MATERIAL_PLAN_MAX_TEXT_CHARS) {
      text = text.slice(0, MATERIAL_PLAN_MAX_TEXT_CHARS)
    }

    return { title, text }
  } catch (error) {
    if (error instanceof Error && error.name === "MaterialPlanError") {
      throw error
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw materialFetchFailed("抓取超时。")
    }
    throw materialFetchFailed()
  } finally {
    clearTimeout(timer)
  }
}
