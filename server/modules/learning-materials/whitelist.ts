import "server-only"

import { materialUnsupportedSource } from "./errors.ts"
import { resolveMaterialSourceAdapter } from "./source-resolver.ts"

export function assertHostnameAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw materialUnsupportedSource()
    }
    resolveMaterialSourceAdapter(rawUrl)
  } catch (error) {
    if (error instanceof Error && error.name === "MaterialPlanError") {
      throw error
    }
    throw materialUnsupportedSource("链接格式不正确。")
  }
}

export function getHostname(rawUrl: string): string {
  return new URL(rawUrl).hostname.toLowerCase()
}
