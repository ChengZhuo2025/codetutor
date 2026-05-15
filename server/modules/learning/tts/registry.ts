import { LearningConfigurationError } from "@/server/modules/learning/errors.ts"
import { invokeDashScopeRealtimeTts } from "@/server/modules/learning/speech.ts"
import { getCurrentRequestId } from "@/server/lib/observability"
import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers.ts"
import { synthesizeDashScopeHttpQwen } from "./adapters/dashscope-http-qwen.ts"
import { synthesizeMiniMaxT2aV2 } from "./adapters/minimax-t2a-v2.ts"
import { synthesizeOpenAIAudioSpeech } from "./adapters/openai-audio-speech.ts"
import type { TtsProtocol, TtsSynthesisInput, TtsSynthesisResult } from "./types.ts"

const TTS_PROTOCOLS = new Set<TtsProtocol>([
  "dashscope_http_qwen",
  "minimax_t2a_v2",
  "openai_audio_speech",
  "dashscope_realtime",
])

function readExplicitProtocol(runtime: MaterialPipelineRuntime) {
  const protocol = runtime.model.metadata?.ttsProtocol
  if (typeof protocol !== "string" || !protocol.trim()) {
    return null
  }
  const normalized = protocol.trim()
  if (!TTS_PROTOCOLS.has(normalized as TtsProtocol)) {
    throw new LearningConfigurationError(`当前文本转语音模型配置了不支持的 ttsProtocol：${normalized}`)
  }
  return normalized as TtsProtocol
}

function logTtsGatewayEvent(
  phase: string,
  input: {
    runtime: MaterialPipelineRuntime
    ttsProtocol?: TtsProtocol
    textLength?: number
    audioBytes?: number
    contentType?: string
    errorMessage?: string
  },
) {
  console.info(JSON.stringify({
    type: "learning_message_speech_tts",
    requestId: getCurrentRequestId(),
    phase,
    providerCode: input.runtime.provider.code,
    modelCode: input.runtime.model.code,
    modelName: input.runtime.model.modelName,
    ttsProtocol: input.ttsProtocol,
    timeoutMs: input.runtime.provider.timeoutMs,
    textLength: input.textLength,
    audioBytes: input.audioBytes,
    contentType: input.contentType,
    errorMessage: input.errorMessage?.slice(0, 240),
  }))
}

export function resolveTtsProtocol(runtime: MaterialPipelineRuntime): TtsProtocol {
  const explicit = readExplicitProtocol(runtime)
  if (explicit) {
    return explicit
  }

  const providerCode = runtime.provider.code.toLowerCase()
  const providerType = runtime.provider.providerType.toLowerCase()
  const baseUrl = runtime.provider.baseUrl.toLowerCase()
  const modelName = runtime.model.modelName.toLowerCase()
  const modelCode = runtime.model.code.toLowerCase()
  const modelBlob = `${modelCode}\n${modelName}`

  if (
    modelBlob.includes("qwen3-tts-flash")
    || modelBlob.includes("qwen3-tts-instruct-flash")
  ) {
    return "dashscope_http_qwen"
  }

  if (
    providerCode.includes("minimax")
    || baseUrl.includes("minimax")
    || modelBlob.includes("minimax")
    || modelBlob.startsWith("speech-")
  ) {
    return "minimax_t2a_v2"
  }

  if (
    providerType === "siliconflow"
    || providerCode.includes("siliconflow")
    || baseUrl.includes("siliconflow")
  ) {
    return "openai_audio_speech"
  }

  throw new LearningConfigurationError("当前文本转语音模型暂不支持用户端播读。")
}

export async function synthesizeTextToSpeech(
  input: TtsSynthesisInput,
): Promise<TtsSynthesisResult> {
  const fetchImpl = input.fetchImpl ?? fetch
  const protocol = resolveTtsProtocol(input.runtime)

  logTtsGatewayEvent("start", {
    runtime: input.runtime,
    ttsProtocol: protocol,
    textLength: input.text.length,
  })

  try {
    let result: TtsSynthesisResult

    if (protocol === "dashscope_http_qwen") {
      result = await synthesizeDashScopeHttpQwen({ ...input, fetchImpl })
    } else if (protocol === "minimax_t2a_v2") {
      result = await synthesizeMiniMaxT2aV2({ ...input, fetchImpl })
    } else if (protocol === "openai_audio_speech") {
      result = await synthesizeOpenAIAudioSpeech({ ...input, fetchImpl })
    } else {
      result = await invokeDashScopeRealtimeTts({
        runtime: input.runtime,
        text: input.text,
      })
    }

    logTtsGatewayEvent("success", {
      runtime: input.runtime,
      ttsProtocol: protocol,
      textLength: input.text.length,
      audioBytes: result.audio.length,
      contentType: result.contentType,
    })

    return result
  } catch (error) {
    logTtsGatewayEvent("provider_error", {
      runtime: input.runtime,
      ttsProtocol: protocol,
      textLength: input.text.length,
      errorMessage: error instanceof Error ? error.message : "TTS provider request failed",
    })
    throw error
  }
}
