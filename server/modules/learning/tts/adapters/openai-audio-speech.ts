import { Buffer } from "node:buffer"

import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import type { TtsAdapterInput, TtsSynthesisResult } from "../types.ts"
import {
  contentTypeForAudioFormat,
  ensureAudioBuffer,
  fetchWithTimeout,
  getTtsProviderSecret,
  normalizeBaseUrl,
  readMetadataString,
  readProviderError,
  resolveTtsTimeoutMs,
} from "../utils.ts"

function resolveAudioSpeechPath(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
  return normalized.endsWith("/v1")
    ? `${normalized}/audio/speech`
    : `${normalized}/audio/speech`
}

export async function synthesizeOpenAIAudioSpeech(
  input: TtsAdapterInput,
): Promise<TtsSynthesisResult> {
  const metadata = input.runtime.model.metadata ?? {}
  const secret = getTtsProviderSecret(input.runtime)
  const timeoutMs = resolveTtsTimeoutMs(input.runtime)
  const responseFormat = readMetadataString(metadata, ["responseFormat", "format"], "mp3")
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
        voice: readMetadataString(metadata, ["ttsVoice", "voice", "defaultVoice"], "alloy"),
        response_format: responseFormat,
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

  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    const body = await readProviderError(response)
    throw new LearningAIProviderError(
      body ? `TTS provider returned JSON instead of audio: ${body}` : "TTS provider returned JSON instead of audio",
    )
  }

  const audio = Buffer.from(await response.arrayBuffer())
  return {
    audio: ensureAudioBuffer(audio, "TTS provider returned empty audio"),
    contentType: contentType ?? contentTypeForAudioFormat(responseFormat),
  }
}
