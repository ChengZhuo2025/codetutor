import "server-only"

import { MATERIAL_PLAN_ALLOWED_HOSTS } from "./constants.ts"
import { materialUnsupportedSource } from "./errors.ts"

export function assertHostnameAllowed(rawUrl: string) {
  let hostname: string
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw materialUnsupportedSource()
    }
    hostname = url.hostname.toLowerCase()
  } catch (error) {
    if (error instanceof Error && error.name === "MaterialPlanError") {
      throw error
    }
    throw materialUnsupportedSource("链接格式不正确。")
  }

  if (!MATERIAL_PLAN_ALLOWED_HOSTS.has(hostname)) {
    throw materialUnsupportedSource()
  }
}

export function getHostname(rawUrl: string): string {
  return new URL(rawUrl).hostname.toLowerCase()
}
