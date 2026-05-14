import "server-only"

import { Buffer } from "node:buffer"
import WebSocket from "ws"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
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
const DASH_SCOPE_REALTIME_PATH = "/api-ws/v1/realtime"

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
  const normalized = (text ?? "").replace(/\s+/g, " ").trim()
  if (!normalized) {
    throw new LearningValidationError("没有可播读的 AI 回复内容。")
  }

  return normalized.slice(0, MAX_SPEECH_TEXT_LENGTH).trim()
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

export async function invokeDashScopeRealtimeTts(input: {
  runtime: LearningSpeechRuntime
  text: string
}): Promise<LearningMessageSpeechResult> {
  const secret = getLearningSpeechSecret(input.runtime)
  const timeoutMs = Math.min(60_000, Math.max(5_000, input.runtime.provider.timeoutMs))
  const url = buildDashScopeRealtimeUrl(input.runtime.model.modelName)

  return new Promise((resolve, reject) => {
    let settled = false
    const audioChunks: Buffer[] = []
    const socket = new WebSocket(url, {
      headers: {
        Authorization: `bearer ${secret}`,
        "X-DashScope-DataInspection": "enable",
      },
    })
    const timer = setTimeout(() => {
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
        reject(new LearningAIProviderError("TTS provider returned empty audio"))
        return
      }

      resolve({
        audio: buildPcmWavBuffer(pcm, {
          sampleRate: DEFAULT_TTS_SAMPLE_RATE,
          channels: 1,
          bitsPerSample: 16,
        }),
        contentType: "audio/wav",
      })
    }

    socket.on("open", () => {
      socket.send(JSON.stringify({
        type: "session.update",
        session: {
          voice: DEFAULT_TTS_VOICE,
          response_format: "pcm_24000hz_mono_16bit",
        },
      }))
      socket.send(JSON.stringify({
        type: "input_text.append",
        text: input.text,
      }))
      socket.send(JSON.stringify({
        type: "input_text.commit",
      }))
      socket.send(JSON.stringify({
        type: "response.create",
      }))
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
        finish(new LearningAIProviderError(record.error?.message ?? "TTS provider returned an error"))
        return
      }

      const audio = parseDashScopeAudioDelta(payload)
      if (audio?.length) {
        audioChunks.push(audio)
      }

      if (record.type === "response.done" || record.type === "response.audio.done") {
        finish()
      }
    })

    socket.on("error", () => {
      finish(new LearningAIProviderError("TTS provider connection failed"))
    })

    socket.on("close", () => {
      if (!settled && audioChunks.length > 0) {
        finish()
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

  const text = normalizeLearningMessageSpeechText(input.text ?? message.content_text)
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
