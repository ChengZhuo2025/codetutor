import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import type { TtsAdapterInput, TtsSynthesisResult } from "../types.ts"
import {
  contentTypeForAudioFormat,
  createTtsProviderStatusError,
  ensureAudioBuffer,
  fetchWithTimeout,
  getTtsProviderSecret,
  normalizeBaseUrl,
  readAudioResponseBuffer,
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

export async function synthesizeDashScopeHttpMiniMax(
  input: TtsAdapterInput,
): Promise<TtsSynthesisResult> {
  const metadata = input.runtime.model.metadata ?? {}
  const secret = getTtsProviderSecret(input.runtime)
  const timeoutMs = resolveTtsTimeoutMs(input.runtime)
  const format = readMetadataString(metadata, ["format", "responseFormat"], "mp3")
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
          voice: readMetadataString(metadata, ["ttsVoice", "voice", "defaultVoice"], "male-qn-qingse"),
          language: readMetadataString(metadata, ["language", "languageType", "language_type"], "zh"),
        },
        parameters: {
          rate: readMetadataNumber(metadata, ["rate", "speechRate"], 0),
        },
      }),
    },
  })

  if (!response.ok) {
    const body = await readProviderError(response)
    throw createTtsProviderStatusError("TTS provider request failed", response, body)
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
    throw createTtsProviderStatusError("TTS audio download failed", audioResponse, body)
  }

  const audio = await readAudioResponseBuffer(audioResponse)
  const contentType = audioResponse.headers.get("content-type") ?? contentTypeForAudioFormat(format)

  return {
    audio: ensureAudioBuffer(audio, "TTS provider returned empty audio"),
    contentType,
  }
}
