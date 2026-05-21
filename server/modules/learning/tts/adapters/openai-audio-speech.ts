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
  readMetadataString,
  readProviderError,
  resolveTtsSpeechSpeed,
  resolveTtsTimeoutMs,
} from "../utils.ts"

function resolveAudioSpeechPath(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
  return normalized.endsWith("/v1")
    ? `${normalized}/audio/speech`
    : `${normalized}/audio/speech`
}

function resolveOpenAIAudioSpeechDefaultVoice(input: TtsAdapterInput) {
  const providerCode = input.runtime.provider.code.toLowerCase()
  const providerType = input.runtime.provider.providerType.toLowerCase()
  const baseUrl = input.runtime.provider.baseUrl.toLowerCase()
  const modelName = input.runtime.model.modelName
  const normalizedModelName = modelName.toLowerCase()

  if (
    providerType === "siliconflow"
    || providerCode.includes("siliconflow")
    || baseUrl.includes("siliconflow")
  ) {
    if (normalizedModelName.includes("cosyvoice")) {
      return `${modelName}:alex`
    }
  }

  return "alloy"
}

export async function synthesizeOpenAIAudioSpeech(
  input: TtsAdapterInput,
): Promise<TtsSynthesisResult> {
  const metadata = input.runtime.model.metadata ?? {}
  const secret = getTtsProviderSecret(input.runtime)
  const timeoutMs = resolveTtsTimeoutMs(input.runtime)
  const responseFormat = readMetadataString(metadata, ["responseFormat", "format"], "mp3")
  const speed = resolveTtsSpeechSpeed(metadata)
  const response = await fetchWithTimeout({
    fetchImpl: input.fetchImpl,
    url: resolveAudioSpeechPath(input.runtime.provider.baseUrl),
    timeoutMs,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.runtime.model.modelName,
        input: input.text,
        voice: readMetadataString(metadata, ["ttsVoice", "voice", "defaultVoice"], resolveOpenAIAudioSpeechDefaultVoice(input)),
        response_format: responseFormat,
        speed,
      }),
    },
  })

  if (!response.ok) {
    const body = await readProviderError(response)
    throw createTtsProviderStatusError("TTS provider request failed", response, body)
  }

  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    const body = await readProviderError(response)
    throw new LearningAIProviderError(
      body ? `TTS provider returned JSON instead of audio: ${body}` : "TTS provider returned JSON instead of audio",
    )
  }

  const audio = await readAudioResponseBuffer(response)
  return {
    audio: ensureAudioBuffer(audio, "TTS provider returned empty audio"),
    contentType: contentType ?? contentTypeForAudioFormat(responseFormat),
  }
}
