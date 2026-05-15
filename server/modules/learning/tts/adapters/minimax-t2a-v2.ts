import type { TtsAdapterInput, TtsSynthesisResult } from "../types.ts"
import {
  contentTypeForAudioFormat,
  decodeHexAudio,
  ensureAudioBuffer,
  fetchWithTimeout,
  getTtsProviderSecret,
  normalizeBaseUrl,
  readMetadataNumber,
  readMetadataString,
  readProviderError,
  resolveTtsTimeoutMs,
} from "../utils.ts"
import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"

export async function synthesizeMiniMaxT2aV2(
  input: TtsAdapterInput,
): Promise<TtsSynthesisResult> {
  const metadata = input.runtime.model.metadata ?? {}
  const secret = getTtsProviderSecret(input.runtime)
  const timeoutMs = resolveTtsTimeoutMs(input.runtime)
  const format = readMetadataString(metadata, ["format", "responseFormat"], "mp3")
  const response = await fetchWithTimeout({
    fetchImpl: input.fetchImpl,
    url: `${normalizeBaseUrl(input.runtime.provider.baseUrl)}/v1/t2a_v2`,
    timeoutMs,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.runtime.model.modelName,
        text: input.text,
        stream: false,
        output_format: "hex",
        voice_setting: {
          voice_id: readMetadataString(metadata, ["ttsVoice", "voice", "defaultVoice"], "male-qn-qingse"),
        },
        audio_setting: {
          sample_rate: readMetadataNumber(metadata, ["sampleRate", "sample_rate"], 32000),
          bitrate: readMetadataNumber(metadata, ["bitrate"], 128000),
          format,
          channel: readMetadataNumber(metadata, ["channel", "channels"], 1),
        },
        language_boost: readMetadataString(metadata, ["languageBoost", "language_boost"], "auto"),
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
    data?: {
      audio?: unknown
    }
    extra_info?: {
      audio_format?: unknown
    }
  } | null
  const hex = payload?.data?.audio
  if (typeof hex !== "string" || !hex.trim()) {
    throw new LearningAIProviderError("TTS provider response missing audio data")
  }

  const upstreamFormat = typeof payload?.extra_info?.audio_format === "string"
    ? payload.extra_info.audio_format
    : format
  const audio = decodeHexAudio(hex)

  return {
    audio: ensureAudioBuffer(audio, "TTS provider returned empty audio"),
    contentType: contentTypeForAudioFormat(upstreamFormat),
  }
}
