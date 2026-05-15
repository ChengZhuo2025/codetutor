import { Buffer } from "node:buffer"

import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import type { TtsAdapterInput, TtsSynthesisResult } from "../types.ts"
import {
  contentTypeForAudioFormat,
  ensureAudioBuffer,
  fetchWithTimeout,
  getTtsProviderSecret,
  normalizeBaseUrl,
  readMetadataNumber,
  readMetadataString,
  readProviderError,
  resolveTtsTimeoutMs,
} from "../utils.ts"

const DEFAULT_DASHSCOPE_HTTP_BASE_URL = "https://dashscope.aliyuncs.com/api/v1"

function resolveDashScopeHttpBaseUrl(input: TtsAdapterInput) {
  const metadata = input.runtime.model.metadata ?? {}
  const configured = typeof metadata.ttsBaseUrl === "string" && metadata.ttsBaseUrl.trim()
  if (configured) {
    return normalizeBaseUrl(configured)
  }

  const baseUrl = normalizeBaseUrl(input.runtime.provider.baseUrl)
  const host = baseUrl.toLowerCase()
  if (host.includes("dashscope.aliyuncs.com") || host.includes("bailian.aliyuncs.com")) {
    return DEFAULT_DASHSCOPE_HTTP_BASE_URL
  }

  return baseUrl
}

export async function synthesizeDashScopeHttpQwen(
  input: TtsAdapterInput,
): Promise<TtsSynthesisResult> {
  const metadata = input.runtime.model.metadata ?? {}
  const secret = getTtsProviderSecret(input.runtime)
  const timeoutMs = resolveTtsTimeoutMs(input.runtime)
  const format = readMetadataString(metadata, ["format", "responseFormat"], "wav")
  const requestUrl = `${resolveDashScopeHttpBaseUrl(input)}/services/aigc/multimodal-generation/generation`

  const response = await fetchWithTimeout({
    fetchImpl: input.fetchImpl,
    url: requestUrl,
    timeoutMs,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.runtime.model.modelName,
        input: {
          text: input.text,
          voice: readMetadataString(metadata, ["ttsVoice", "voice", "defaultVoice"], "Cherry"),
          language_type: readMetadataString(metadata, ["languageType", "language_type"], "Chinese"),
        },
        parameters: {
          rate: readMetadataNumber(metadata, ["rate", "speechRate"], 0),
        },
      }),
    },
  })

  if (!response.ok) {
    const body = await readProviderError(response)
    throw new LearningAIProviderError(
      body
        ? `TTS provider request failed with status ${response.status}: ${body}`
        : `TTS provider request failed with status ${response.status}`,
    )
  }

  const payload = await response.json().catch(() => null) as {
    output?: {
      audio?: {
        url?: unknown
      }
    }
  } | null
  const audioUrl = payload?.output?.audio?.url
  if (typeof audioUrl !== "string" || !audioUrl.trim()) {
    throw new LearningAIProviderError("TTS provider response missing audio URL")
  }

  const audioResponse = await fetchWithTimeout({
    fetchImpl: input.fetchImpl,
    url: audioUrl.trim(),
    timeoutMs,
  })

  if (!audioResponse.ok) {
    const body = await readProviderError(audioResponse)
    throw new LearningAIProviderError(
      body
        ? `TTS audio download failed with status ${audioResponse.status}: ${body}`
        : `TTS audio download failed with status ${audioResponse.status}`,
    )
  }

  const audio = Buffer.from(await audioResponse.arrayBuffer())
  const contentType = audioResponse.headers.get("content-type") ?? contentTypeForAudioFormat(format)

  return {
    audio: ensureAudioBuffer(audio, "TTS provider returned empty audio"),
    contentType,
  }
}
