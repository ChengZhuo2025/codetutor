import { Buffer } from "node:buffer"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { LearningAIProviderError, LearningConfigurationError } from "@/server/modules/learning/errors.ts"
import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers.ts"

const DEFAULT_TIMEOUT_MS = 25_000
const MIN_TIMEOUT_MS = 3_000
const MAX_TIMEOUT_MS = 25_000

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
  return audio
}

export function decodeHexAudio(hex: string) {
  const normalized = hex.trim()
  if (!normalized || normalized.length % 2 !== 0 || !/^[\da-f]+$/i.test(normalized)) {
    throw new LearningAIProviderError("TTS provider returned invalid hex audio")
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
      throw new LearningAIProviderError("TTS request timed out")
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
