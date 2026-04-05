/**
 * Client-side limits for Provider 表单；须与
 * `parseAdminAIProviderBody`（server/lib/request-validation.ts）保持一致。
 */
export const PROVIDER_TIMEOUT_MS_MIN = 1000
export const PROVIDER_TIMEOUT_MS_MAX = 300_000
export const PROVIDER_RETRY_COUNT_MIN = 1
export const PROVIDER_RETRY_COUNT_MAX = 10
export const PROVIDER_BASE_URL_MIN_LENGTH = 8
export const PROVIDER_BASE_URL_MAX_LENGTH = 500

export function isValidProviderBaseUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function parseProviderMetadataJson(
  text: string,
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const normalized = text.trim()
  if (!normalized) {
    return { ok: true, data: {} }
  }

  try {
    const parsed: unknown = JSON.parse(normalized)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "Metadata 必须是 JSON 对象（不能是数组或原始值）。" }
    }
    return { ok: true, data: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, message: "Metadata JSON 格式不正确。" }
  }
}
