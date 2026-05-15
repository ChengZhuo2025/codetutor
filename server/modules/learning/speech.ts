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
const DASH_SCOPE_DEFAULT_BASE_URL = "wss://dashscope.aliyuncs.com"
const DASH_SCOPE_REALTIME_PATH = "/api-ws/v1/realtime"
const DASH_SCOPE_TTS_RESPONSE_FORMAT = "pcm"
const DASH_SCOPE_TTS_MODE = "server_commit"
const DASH_SCOPE_TTS_LANGUAGE_TYPE = "Auto"
const DEFAULT_TTS_INSTRUCTIONS = "用自然、清晰、耐心的中文教学口吻朗读。"
const MIN_SPEECH_TIMEOUT_MS = 5_000
const MAX_USER_FACING_SPEECH_TIMEOUT_MS = 25_000
// WebSocket 握手超时：若连接无法建立则快速失败，不等到整体超时
const DASH_SCOPE_HANDSHAKE_TIMEOUT_MS = 10_000
const DASH_SCOPE_SESSION_UPDATE_ACK_TIMEOUT_MS = 3_000
const DASH_SCOPE_FINISH_DELAY_MS = 1_000
const DASH_SCOPE_MAX_SESSION_UPDATE_ATTEMPTS = 2

type ConversationMessageSpeechRow = {
  id: string
  role: string
  content_text: string | null
  conversation_sessions: {
    user_id: string
  } | null
}

type LearningSpeechRuntime = MaterialPipelineRuntime
type DashScopeTtsServerEvent = {
  type?: string
  event_id?: string
  session?: {
    id?: string
  }
  response?: {
    id?: string
  }
  item_id?: string
  error?: {
    code?: string
    message?: string
  }
}

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

// 支持通过模型 metadata.ttsWebSocketBaseUrl 覆盖默认地址（如配置 VPC 内网端点）
export function resolveDashScopeRealtimeBaseUrl(runtime: LearningSpeechRuntime) {
  const metadata = runtime.model.metadata ?? {}
  const custom = typeof metadata.ttsWebSocketBaseUrl === "string" && metadata.ttsWebSocketBaseUrl.trim()
  return custom || DASH_SCOPE_DEFAULT_BASE_URL
}

function buildDashScopeRealtimeUrl(modelName: string, baseUrl: string = DASH_SCOPE_DEFAULT_BASE_URL) {
  const url = new URL(`${baseUrl}${DASH_SCOPE_REALTIME_PATH}`)
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
    serverEventType?: string
    serverEventId?: string
    serverSessionId?: string
    serverResponseId?: string
    serverItemId?: string
    serverErrorCode?: string
    serverErrorMessage?: string
    serverEventKeys?: string[]
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
    serverEventType: input.serverEventType,
    serverEventId: input.serverEventId,
    serverSessionId: input.serverSessionId,
    serverResponseId: input.serverResponseId,
    serverItemId: input.serverItemId,
    serverErrorCode: input.serverErrorCode,
    serverErrorMessage: input.serverErrorMessage,
    serverEventKeys: input.serverEventKeys,
  }))
}

export function resolveLearningTtsVoice(runtime: LearningSpeechRuntime) {
  const metadata = runtime.model.metadata ?? {}
  return normalizeTtsVoice(metadata.ttsVoice)
    ?? normalizeTtsVoice(metadata.voice)
    ?? normalizeTtsVoice(metadata.defaultVoice)
    ?? DEFAULT_TTS_VOICE
}

export function resolveLearningTtsInstructions(runtime: LearningSpeechRuntime) {
  const metadata = runtime.model.metadata ?? {}
  const configured = typeof metadata.ttsInstructions === "string" && metadata.ttsInstructions.trim()
  if (configured) {
    return configured
  }

  return runtime.model.modelName.includes("instruct")
    ? DEFAULT_TTS_INSTRUCTIONS
    : null
}

function resolveLearningTtsOptimizeInstructions(runtime: LearningSpeechRuntime) {
  const metadata = runtime.model.metadata ?? {}
  return typeof metadata.optimizeInstructions === "boolean"
    ? metadata.optimizeInstructions
    : false
}

export function buildDashScopeTtsSessionUpdate(
  runtime: LearningSpeechRuntime,
  createEventId: () => string = createDashScopeEventId,
) {
  const instructions = resolveLearningTtsInstructions(runtime)
  return {
    event_id: createEventId(),
    type: "session.update",
    session: {
      voice: resolveLearningTtsVoice(runtime),
      response_format: DASH_SCOPE_TTS_RESPONSE_FORMAT,
      sample_rate: DEFAULT_TTS_SAMPLE_RATE,
      mode: DASH_SCOPE_TTS_MODE,
      language_type: DASH_SCOPE_TTS_LANGUAGE_TYPE,
      ...(instructions
        ? {
            instructions,
            optimize_instructions: resolveLearningTtsOptimizeInstructions(runtime),
          }
        : {}),
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
  ]
}

export function buildDashScopeTtsFinishEvent(
  createEventId: () => string = createDashScopeEventId,
) {
  return {
    event_id: createEventId(),
    type: "session.finish",
  }
}

export function buildDashScopeTtsAuthorizationHeader(secret: string) {
  return `Bearer ${secret}`
}

export function isDashScopeTtsTerminalEvent(type: string | null | undefined) {
  return type === "response.done"
    || type === "response.audio.done"
    || type === "session.finished"
}

export function summarizeDashScopeTtsServerEvent(event: unknown) {
  if (!event || typeof event !== "object") {
    return null
  }

  const record = event as DashScopeTtsServerEvent
  const eventKeys = Object.keys(record).sort().slice(0, 16)
  return {
    serverEventType: typeof record.type === "string" ? record.type : undefined,
    serverEventId: typeof record.event_id === "string" ? record.event_id : undefined,
    serverResponseId: typeof record.response?.id === "string" ? record.response.id : undefined,
    serverSessionId: typeof record.session?.id === "string" ? record.session.id : undefined,
    serverItemId: typeof record.item_id === "string" ? record.item_id : undefined,
    serverErrorCode: typeof record.error?.code === "string" ? record.error.code : undefined,
    serverErrorMessage: typeof record.error?.message === "string" ? record.error.message.slice(0, 240) : undefined,
    serverEventKeys: eventKeys,
  }
}

export function createDashScopeTtsSessionUpdateTracker() {
  let updateAttempts = 0
  let sessionUpdated = false
  let updateTimedOut = false
  let fallbackUsed = false

  return {
    markSessionUpdateSent() {
      updateAttempts += 1
      updateTimedOut = false
    },
    markSessionUpdated() {
      sessionUpdated = true
      updateTimedOut = false
    },
    markSessionUpdateTimedOut() {
      if (!sessionUpdated) {
        updateTimedOut = true
      }
    },
    shouldRetryAfterSessionCreated() {
      return !sessionUpdated && updateAttempts < DASH_SCOPE_MAX_SESSION_UPDATE_ATTEMPTS
    },
    shouldSendSynthesisEvents() {
      return sessionUpdated
    },
    shouldFallbackSynthesis() {
      if (sessionUpdated || !updateTimedOut || fallbackUsed) {
        return false
      }
      fallbackUsed = true
      return true
    },
  }
}

export async function invokeDashScopeRealtimeTts(input: {
  runtime: LearningSpeechRuntime
  text: string
}): Promise<LearningMessageSpeechResult> {
  const secret = getLearningSpeechSecret(input.runtime)
  const timeoutMs = resolveLearningMessageSpeechTimeoutMs(input.runtime.provider.timeoutMs)
  const baseUrl = resolveDashScopeRealtimeBaseUrl(input.runtime)
  const url = buildDashScopeRealtimeUrl(input.runtime.model.modelName, baseUrl)

  logLearningSpeechTtsEvent("start", {
    runtime: input.runtime,
    timeoutMs,
    textLength: input.text.length,
  })

  return new Promise((resolve, reject) => {
    let settled = false
    let sawAudio = false
    let synthesisEventsSent = false
    const sessionUpdateTracker = createDashScopeTtsSessionUpdateTracker()
    let sessionUpdateAckTimer: ReturnType<typeof setTimeout> | null = null
    let finishEventTimer: ReturnType<typeof setTimeout> | null = null
    const audioChunks: Buffer[] = []
    const socket = new WebSocket(url, {
      headers: {
        Authorization: buildDashScopeTtsAuthorizationHeader(secret),
        "X-DashScope-DataInspection": "enable",
      },
      // 握手超时：若 TCP/TLS 握手挂起则快速失败，不等到整体超时
      handshakeTimeout: DASH_SCOPE_HANDSHAKE_TIMEOUT_MS,
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
      if (sessionUpdateAckTimer) {
        clearTimeout(sessionUpdateAckTimer)
        sessionUpdateAckTimer = null
      }
      if (finishEventTimer) {
        clearTimeout(finishEventTimer)
        finishEventTimer = null
      }
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

    const sendSessionUpdate = () => {
      if (sessionUpdateAckTimer) {
        clearTimeout(sessionUpdateAckTimer)
        sessionUpdateAckTimer = null
      }
      sessionUpdateTracker.markSessionUpdateSent()
      logLearningSpeechTtsEvent("session_update", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
      })
      socket.send(JSON.stringify(buildDashScopeTtsSessionUpdate(input.runtime)))
      sessionUpdateAckTimer = setTimeout(() => {
        sessionUpdateTracker.markSessionUpdateTimedOut()
        if (sessionUpdateTracker.shouldFallbackSynthesis()) {
          logLearningSpeechTtsEvent("session_update_ack_timeout", {
            runtime: input.runtime,
            timeoutMs,
            textLength: input.text.length,
          })
          sendSynthesisEvents()
        }
      }, DASH_SCOPE_SESSION_UPDATE_ACK_TIMEOUT_MS)
    }

    const sendSynthesisEvents = () => {
      if (synthesisEventsSent || settled) {
        return
      }
      synthesisEventsSent = true
      if (sessionUpdateAckTimer) {
        clearTimeout(sessionUpdateAckTimer)
        sessionUpdateAckTimer = null
      }
      for (const event of buildDashScopeTtsTextEvents(input.text)) {
        logLearningSpeechTtsEvent("text_append", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
        })
        socket.send(JSON.stringify(event))
      }
      finishEventTimer = setTimeout(() => {
        if (settled) {
          return
        }
        logLearningSpeechTtsEvent("session_finish", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
        })
        socket.send(JSON.stringify(buildDashScopeTtsFinishEvent()))
      }, DASH_SCOPE_FINISH_DELAY_MS)
    }

    socket.on("open", () => {
      logLearningSpeechTtsEvent("connected", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
      })
      sendSessionUpdate()
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

      const record = payload as DashScopeTtsServerEvent
      const eventSummary = summarizeDashScopeTtsServerEvent(payload)
      if (record.type === "session.created") {
        logLearningSpeechTtsEvent("session_created", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
          ...eventSummary,
        })
        if (sessionUpdateTracker.shouldRetryAfterSessionCreated()) {
          logLearningSpeechTtsEvent("session_update_retry", {
            runtime: input.runtime,
            timeoutMs,
            textLength: input.text.length,
            ...eventSummary,
          })
          sendSessionUpdate()
        }
        return
      }

      if (record.type === "session.updated") {
        sessionUpdateTracker.markSessionUpdated()
        logLearningSpeechTtsEvent("session_updated", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
          ...eventSummary,
        })
        sendSynthesisEvents()
        return
      }

      if (record.type?.includes("error")) {
        logLearningSpeechTtsEvent("provider_error", {
          runtime: input.runtime,
          timeoutMs,
          textLength: input.text.length,
          errorMessage: record.error?.message ?? record.error?.code ?? "TTS provider returned an error",
          ...eventSummary,
        })
        finish(new LearningAIProviderError(record.error?.message ?? record.error?.code ?? "TTS provider returned an error"))
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
        return
      }

      logLearningSpeechTtsEvent("server_event", {
        runtime: input.runtime,
        timeoutMs,
        textLength: input.text.length,
        ...eventSummary,
      })
      if (eventSummary?.serverEventType?.toLowerCase().includes("error")) {
        finish(new LearningAIProviderError(eventSummary.serverErrorMessage ?? eventSummary.serverErrorCode ?? "TTS provider returned an error"))
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
