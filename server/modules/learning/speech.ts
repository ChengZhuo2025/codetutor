import "server-only"

import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import WebSocket from "ws"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { getCurrentRequestId } from "@/server/lib/observability"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { normalizeSpeechTextForTts } from "@/lib/learning/speech-text"
import { resolveLearningMediaTranscriptionModels } from "@/server/modules/admin-ai/media-service"
import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers"
import {
  LearningAIProviderError,
  LearningConfigurationError,
  LearningValidationError,
} from "./errors.ts"

const MAX_SPEECH_TEXT_LENGTH = 2000
const DEFAULT_TTS_VOICE = "Cherry"
const DEFAULT_TTS_SAMPLE_RATE = 24000
const DEFAULT_TTS_CHANNELS = 1
const DEFAULT_TTS_BITS_PER_SAMPLE = 16
const DASH_SCOPE_REALTIME_PATH = "/api-ws/v1/realtime"
const DASH_SCOPE_TTS_RESPONSE_FORMAT = "pcm"
const MIN_SPEECH_TIMEOUT_MS = 5_000
const MAX_USER_FACING_SPEECH_TIMEOUT_MS = 25_000

type ConversationMessageSpeechRow = {
  id: string
  role: string
  content_text: string | null
  conversation_sessions: {
    user_id: string
  } | null
}

type LearningSpeechRuntime = MaterialPipelineRuntime

export type LearningMessageSpeechInput = {
  messageId: string
  text?: string | null
}

export type LearningMessageSpeechResult = {
  audio: Buffer
  contentType: string
}

export function normalizeLearningMessageSpeechText(text: string | null | undefined) {
  const normalized = normalizeSpeechTextForTts(text)
  if (!normalized) {
    throw new LearningValidationError("没有可播读的 AI 回复内容。")
  }

  return normalized.slice(0, MAX_SPEECH_TEXT_LENGTH).trim()
}

export function resolveLearningMessageSpeechSourceText(
  clientText: string | null | undefined,
  persistedText: string | null | undefined,
) {
  const normalizedClientText = clientText?.trim()

  return normalizedClientText ? clientText : persistedText
}

export function resolveLearningMessageSpeechTimeoutMs(providerTimeoutMs: number) {
  return Math.min(
    MAX_USER_FACING_SPEECH_TIMEOUT_MS,
    Math.max(MIN_SPEECH_TIMEOUT_MS, providerTimeoutMs),
  )
}

export function resolveDashScopeTtsCloseErrorMessage(
  code: number,
  reason: unknown,
) {
  const reasonText = Buffer.isBuffer(reason)
    ? reason.toString("utf8").trim()
    : typeof reason === "string"
      ? reason.trim()
      : ""

  return reasonText
    ? `TTS provider closed before returning audio (code ${code}: ${reasonText})`
    : `TTS provider closed before returning audio (code ${code})`
}

export function buildPcmWavBuffer(
  pcm: Buffer,
  input: {
    sampleRate: number
    channels: number
    bitsPerSample: number
  },
) {
  const byteRate = input.sampleRate * input.channels * input.bitsPerSample / 8
  const blockAlign = input.channels * input.bitsPerSample / 8
  const header = Buffer.alloc(44)

  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(input.channels, 22)
  header.writeUInt32LE(input.sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(input.bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)

  return Buffer.concat([header, pcm])
}

function providerSupportsDashScopeRealtimeTts(runtime: LearningSpeechRuntime) {
  const host = runtime.provider.baseUrl.toLowerCase()
  return host.includes("dashscope.aliyuncs.com") || host.includes("bailian.aliyuncs.com")
}

function buildDashScopeRealtimeUrl(modelName: string) {
  const url = new URL(`wss://dashscope.aliyuncs.com${DASH_SCOPE_REALTIME_PATH}`)
  url.searchParams.set("model", modelName)
  return url.toString()
}

function getLearningSpeechSecret(runtime: LearningSpeechRuntime) {
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

function parseDashScopeAudioDelta(event: unknown): Buffer | null {
  if (!event || typeof event !== "object") {
    return null
  }

  const record = event as {
    type?: unknown
    delta?: unknown
    audio?: unknown
    data?: unknown
  }
  const candidate = typeof record.delta === "string"
    ? record.delta
    : typeof record.audio === "string"
      ? record.audio
      : typeof record.data === "string"
        ? record.data
        : null

  if (!candidate) {
    return null
  }

  try {
    return Buffer.from(candidate, "base64")
  } catch {
    return null
  }
}

function normalizeTtsVoice(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function createDashScopeEventId() {
  return `event_${randomUUID()}`
}

function logLearningSpeechTtsEvent(
  phase: string,
  input: {
    runtime: LearningSpeechRuntime
    timeoutMs?: number
    textLength?: number
    audioBytes?: number
    closeCode?: number
    closeReason?: unknown
    errorMessage?: string
  },
) {
  const closeReason = Buffer.isBuffer(input.closeReason)
    ? input.closeReason.toString("utf8").slice(0, 160)
    : typeof input.closeReason === "string"
      ? input.closeReason.slice(0, 160)
      : undefined

  console.info(JSON.stringify({
    type: "learning_message_speech_tts",
    requestId: getCurrentRequestId(),
    phase,
    providerCode: input.runtime.provider.code,
    modelCode: input.runtime.model.code,
    modelName: input.runtime.model.modelName,
    timeoutMs: input.timeoutMs,
    textLength: input.textLength,
    audioBytes: input.audioBytes,
    closeCode: input.closeCode,
    closeReason,
    errorMessage: input.errorMessage,
  }))
}

export function resolveLearningTtsVoice(runtime: LearningSpeechRuntime) {
  const metadata = runtime.model.metadata ?? {}
  return normalizeTtsVoice(metadata.ttsVoice)
    ?? normalizeTtsVoice(metadata.voice)
    ?? normalizeTtsVoice(metadata.defaultVoice)
    ?? DEFAULT_TTS_VOICE
}

export function buildDashScopeTtsSessionUpdate(
  runtime: LearningSpeechRuntime,
  createEventId: () => string = createDashScopeEventId,
) {
  return {
    event_id: createEventId(),
    type: "session.update",
    session: {
      voice: resolveLearningTtsVoice(runtime),
      response_format: DASH_SCOPE_TTS_RESPONSE_FORMAT,
      sample_rate: DEFAULT_TTS_SAMPLE_RATE,
      mode: "commit",
    },
  }
}

export function buildDashScopeTtsTextEvents(
  text: string,
  createEventId: () => string = createDashScopeEventId,
) {
  return [
    {
      event_id: createEventId(),
      type: "input_text_buffer.append",
      text,
    },
    {
      event_id: createEventId(),
      type: "input_text_buffer.commit",
    },
    {
      event_id: createEventId(),
      type: "session.finish",
    },
  ]
}

export function isDashScopeTtsTerminalEvent(type: string | null | undefined) {
  return type === "response.done"
    || type === "response.audio.done"
    || type === "session.finished"
}

export async function invokeDashScopeRealtimeTts(input: {
  runtime: LearningSpeechRuntime
  text: string
}): Promise<LearningMessageSpeechResult> {
  const secret = getLearningSpeechSecret(input.runtime)
  const timeoutMs = resolveLearningMessageSpeechTimeoutMs(input.runtime.provider.timeoutMs)
  const url = buildDashScopeRealtimeUrl(input.runtime.model.modelName)

  logLearningSpeechTtsEvent("start", {
    runtime: input.runtime,
    timeoutMs,
    textLength: input.text.length,
  })

  return new Promise((resolve, reject) => {
    let settled = false
    let sawAudio = false
    const audioChunks: Buffer[] = []
    const socket = new WebSocket(url, {
      headers: {
        Authorization: `bearer ${secret}`,
        "X-DashScope-DataInspection": "enable",
      },
    })
    const timer = setTimeout(() => {
      logLearningSpeechTtsEvent("timeout", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
        audioBytes: audioChunks.reduce((sum, chunk) => sum + chunk.length, 0),
      })
      finish(new LearningAIProviderError("TTS request timed out"))
    }, timeoutMs)

    const finish = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      try {
        socket.close()
      } catch {
        // ignore close errors
      }
      if (error) {
        reject(error)
        return
      }

      const pcm = Buffer.concat(audioChunks)
      if (pcm.length === 0) {
        logLearningSpeechTtsEvent("empty_audio", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
        })
        reject(new LearningAIProviderError("TTS provider returned empty audio"))
        return
      }

      logLearningSpeechTtsEvent("success", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
        audioBytes: pcm.length,
      })
      resolve({
        audio: buildPcmWavBuffer(pcm, {
          sampleRate: DEFAULT_TTS_SAMPLE_RATE,
          channels: DEFAULT_TTS_CHANNELS,
          bitsPerSample: DEFAULT_TTS_BITS_PER_SAMPLE,
        }),
        contentType: "audio/wav",
      })
    }

    socket.on("open", () => {
      logLearningSpeechTtsEvent("open", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
      })
      socket.send(JSON.stringify(buildDashScopeTtsSessionUpdate(input.runtime)))
      for (const event of buildDashScopeTtsTextEvents(input.text)) {
        socket.send(JSON.stringify(event))
      }
    })

    socket.on("message", (data) => {
      const raw = typeof data === "string"
        ? data
        : Buffer.isBuffer(data)
          ? data.toString("utf8")
          : ""
      if (!raw) {
        return
      }

      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        return
      }

      const record = payload as { type?: string; error?: { message?: string } }
      if (record.type?.includes("error")) {
        logLearningSpeechTtsEvent("provider_error", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
          errorMessage: record.error?.message ?? "TTS provider returned an error",
        })
        finish(new LearningAIProviderError(record.error?.message ?? "TTS provider returned an error"))
        return
      }

      const audio = parseDashScopeAudioDelta(payload)
      if (audio?.length) {
        if (!sawAudio) {
          sawAudio = true
          logLearningSpeechTtsEvent("first_audio", {
            runtime: input.runtime,
            timeoutMs,
            textLength: input.text.length,
            audioBytes: audio.length,
          })
        }
        audioChunks.push(audio)
      }

      if (isDashScopeTtsTerminalEvent(record.type)) {
        finish()
      }
    })

    socket.on("error", (error) => {
      logLearningSpeechTtsEvent("connection_error", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
        errorMessage: error instanceof Error ? error.message : "TTS provider connection failed",
      })
      finish(new LearningAIProviderError("TTS provider connection failed"))
    })

    socket.on("close", (code, reason) => {
      if (!settled && audioChunks.length > 0) {
        finish()
        return
      }

      if (!settled) {
        const message = resolveDashScopeTtsCloseErrorMessage(code, reason)
        logLearningSpeechTtsEvent("close_without_audio", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
          closeCode: code,
          closeReason: reason,
          errorMessage: message,
        })
        finish(new LearningAIProviderError(message))
      }
    })
  })
}

async function loadAssistantMessageForSpeech(
  userId: string,
  messageId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, role, content_text, conversation_sessions!inner(user_id)")
    .eq("id", messageId)
    .eq("conversation_sessions.user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const row = data as ConversationMessageSpeechRow | null
  if (!row || row.role !== "assistant") {
    return null
  }

  return row
}

export async function synthesizeLearningMessageSpeech(
  userId: string,
  input: LearningMessageSpeechInput,
): Promise<LearningMessageSpeechResult | null> {
  const message = await loadAssistantMessageForSpeech(userId, input.messageId)
  if (!message) {
    return null
  }

  const text = normalizeLearningMessageSpeechText(
    resolveLearningMessageSpeechSourceText(input.text, message.content_text),
  )
  const models = await resolveLearningMediaTranscriptionModels()
  const runtime = models.textToSpeech
  if (!runtime) {
    throw new LearningConfigurationError("当前未配置文本转语音模型。")
  }

  if (!providerSupportsDashScopeRealtimeTts(runtime)) {
    throw new LearningConfigurationError("当前文本转语音模型暂不支持用户端播读。")
  }

  return invokeDashScopeRealtimeTts({
    runtime,
    text,
  })
}
