import { Buffer } from "node:buffer"
import { isIP } from "node:net"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { LearningAIProviderError, LearningConfigurationError } from "@/server/modules/learning/errors.ts"
import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers.ts"

const DEFAULT_TIMEOUT_MS = 25_000
const MIN_TIMEOUT_MS = 3_000
const MAX_TIMEOUT_MS = 25_000
export const MAX_TTS_AUDIO_BYTES = 8 * 1024 * 1024

export function getTtsProviderSecret(runtime: MaterialPipelineRuntime) {
  const resolved = resolveProviderSecret({
    secret_ref: runtime.provider.envSecretRef,
    secret_ciphertext: runtime.provider.secretCiphertext,
    secret_iv: runtime.provider.secretIv,
    secret_auth_tag: runtime.provider.secretAuthTag,
    secret_key_version: runtime.provider.secretKeyVersion,
  })

  if (!resolved.secret) {
    throw new LearningConfigurationError("文本转语音 Provider 未配置可用 API Key。")
  }

  return resolved.secret
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "")
}

export function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return fallback
}

export function readMetadataNumber(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: number,
) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }
  return fallback
}

export function resolveTtsTimeoutMs(runtime: MaterialPipelineRuntime) {
  const timeoutMs = runtime.provider.timeoutMs || DEFAULT_TIMEOUT_MS
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, timeoutMs))
}

export function contentTypeForAudioFormat(format: string | null | undefined) {
  const normalized = format?.trim().toLowerCase()
  if (normalized === "wav" || normalized === "wave") {
    return "audio/wav"
  }
  if (normalized === "mp3" || normalized === "mpeg") {
    return "audio/mpeg"
  }
  if (normalized === "opus") {
    return "audio/opus"
  }
  if (normalized === "aac") {
    return "audio/aac"
  }
  if (normalized === "flac") {
    return "audio/flac"
  }
  if (normalized === "pcm") {
    return "audio/wav"
  }
  return "application/octet-stream"
}

export function ensureAudioBuffer(audio: Buffer, message: string) {
  if (audio.length === 0) {
    throw new LearningAIProviderError(message)
  }
  if (audio.length > MAX_TTS_AUDIO_BYTES) {
    throw new LearningAIProviderError("TTS provider returned oversized audio")
  }
  return audio
}

export function decodeHexAudio(hex: string) {
  const normalized = hex.trim()
  if (!normalized || normalized.length % 2 !== 0 || !/^[\da-f]+$/i.test(normalized)) {
    throw new LearningAIProviderError("TTS provider returned invalid hex audio")
  }
  if (normalized.length / 2 > MAX_TTS_AUDIO_BYTES) {
    throw new LearningAIProviderError("TTS provider returned oversized audio")
  }
  return Buffer.from(normalized, "hex")
}

export async function fetchWithTimeout(input: {
  fetchImpl: typeof fetch
  url: string
  init?: RequestInit
  timeoutMs: number
}) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, input.timeoutMs)

  try {
    return await input.fetchImpl(input.url, {
      ...input.init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LearningAIProviderError("TTS request timed out", { retryable: true })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function readProviderError(response: Response) {
  const text = await response.text().catch(() => "")
  return text.slice(0, 400).trim()
}

export function isRetryableTtsStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

export function createTtsProviderStatusError(prefix: string, response: Response, body: string) {
  return new LearningAIProviderError(
    body
      ? `${prefix} with status ${response.status}: ${body}`
      : `${prefix} with status ${response.status}`,
    { retryable: isRetryableTtsStatus(response.status) },
  )
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a === 198 && (b === 18 || b === 19)
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  return normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
}

function isTrustedHttpTtsAudioHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized.endsWith(".aliyuncs.com")
    && (normalized.includes("dashscope") || normalized.includes("oss-"))
}

export function assertSafeTtsAudioUrl(urlText: string) {
  let url: URL
  try {
    url = new URL(urlText)
  } catch {
    throw new LearningAIProviderError("TTS provider returned invalid audio URL")
  }

  if (url.protocol !== "https:" && !(url.protocol === "http:" && isTrustedHttpTtsAudioHost(url.hostname))) {
    throw new LearningAIProviderError("TTS provider returned unsafe audio URL")
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new LearningAIProviderError("TTS provider returned unsafe audio URL")
  }

  const ipKind = isIP(hostname)
  if ((ipKind === 4 && isPrivateIpv4(hostname)) || (ipKind === 6 && isPrivateIpv6(hostname))) {
    throw new LearningAIProviderError("TTS provider returned unsafe audio URL")
  }

  return url.toString()
}

export async function readAudioResponseBuffer(response: Response) {
  const contentLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_TTS_AUDIO_BYTES) {
    throw new LearningAIProviderError("TTS provider returned oversized audio")
  }

  if (!response.body) {
    const audio = Buffer.from(await response.arrayBuffer())
    return ensureAudioBuffer(audio, "TTS provider returned empty audio")
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value) {
        continue
      }

      total += value.byteLength
      if (total > MAX_TTS_AUDIO_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new LearningAIProviderError("TTS provider returned oversized audio")
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }

  return ensureAudioBuffer(Buffer.concat(chunks), "TTS provider returned empty audio")
}
