import "server-only"

import { Buffer } from "node:buffer"

import { resolveProviderSecret } from "@/server/lib/secrets/provider-secret"
import { LearningAIProviderError } from "@/server/modules/learning/errors.ts"
import { modelSupportsRuntimeCapability } from "@/server/modules/ai/model-profile.ts"
import {
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import {
  invokeAIProvider,
  type AIChatContentPart,
  type AIChatMessage,
} from "@/server/modules/learning/provider.ts"

type AIProviderRow = {
  id: string
  code: string
  provider_type: "siliconflow" | "openai_compatible" | "anthropic"
  base_url: string
  auth_mode: "bearer" | "api_key_header"
  secret_ref: string | null
  secret_ciphertext: string | null
  secret_iv: string | null
  secret_auth_tag: string | null
  secret_key_version: string | null
  timeout_ms: number
  retry_count: number
  is_active: boolean
}

type AIModelRow = {
  id: string
  provider_id: string
  code: string
  model_name: string
  default_max_output_tokens: number
  recommended_temperature: number | null
  is_active: boolean
  runtime_capabilities?: string[] | null
  metadata?: {
    capabilities?: string[]
  } | null
}

export type MaterialPipelineRuntime = {
  provider: {
    code: string
    providerType: "siliconflow" | "openai_compatible" | "anthropic"
    baseUrl: string
    authMode: "bearer" | "api_key_header"
    envSecretRef: string | null
    secretCiphertext: string | null
    secretIv: string | null
    secretAuthTag: string | null
    secretKeyVersion: string | null
    timeoutMs: number
    retryCount: number
  }
  model: {
    code: string
    modelName: string
    defaultMaxOutputTokens: number
    recommendedTemperature: number | null
  }
}

export type MaterialPipelineModels = {
  asr: MaterialPipelineRuntime | null
  vision: MaterialPipelineRuntime | null
  quality: MaterialPipelineRuntime | null
}

function findCapabilityModel(
  models: AIModelRow[],
  capability: string,
) {
  return models.find((model) => (
    model.is_active
    && (capability === "asr" || capability === "vision" || capability === "quality_check")
    && modelSupportsRuntimeCapability(model, capability)
  )) ?? null
}

function toRuntime(
  providers: AIProviderRow[],
  model: AIModelRow | null,
) {
  if (!model) {
    return null
  }

  const provider = providers.find((item) => item.id === model.provider_id && item.is_active) ?? null
  if (!provider) {
    return null
  }

  return {
    provider: {
      code: provider.code,
      providerType: provider.provider_type,
      baseUrl: provider.base_url,
      authMode: provider.auth_mode,
      envSecretRef: provider.secret_ref,
      secretCiphertext: provider.secret_ciphertext,
      secretIv: provider.secret_iv,
      secretAuthTag: provider.secret_auth_tag,
      secretKeyVersion: provider.secret_key_version,
      timeoutMs: provider.timeout_ms,
      retryCount: provider.retry_count,
    },
    model: {
      code: model.code,
      modelName: model.model_name,
      defaultMaxOutputTokens: model.default_max_output_tokens,
      recommendedTemperature: model.recommended_temperature,
    },
  } satisfies MaterialPipelineRuntime
}

function resolveEnvOrCapabilityRuntime(input: {
  envCode?: string
  providers: AIProviderRow[]
  models: AIModelRow[]
  capability: string
}) {
  const envModel = input.envCode
    ? input.models.find((model) => model.code === input.envCode && model.is_active) ?? null
    : null

  return toRuntime(
    input.providers,
    envModel ?? findCapabilityModel(input.models, input.capability),
  )
}

export function resolveMaterialPipelineModelsFromSnapshots(input: {
  providers: AIProviderRow[]
  models: AIModelRow[]
  env?: {
    MATERIAL_PLAN_ASR_MODEL_CODE?: string
    MATERIAL_PLAN_VISION_MODEL_CODE?: string
    MATERIAL_PLAN_QUALITY_MODEL_CODE?: string
  }
}): MaterialPipelineModels {
  return {
    asr: resolveEnvOrCapabilityRuntime({
      envCode: input.env?.MATERIAL_PLAN_ASR_MODEL_CODE,
      providers: input.providers,
      models: input.models,
      capability: "asr",
    }),
    vision: resolveEnvOrCapabilityRuntime({
      envCode: input.env?.MATERIAL_PLAN_VISION_MODEL_CODE,
      providers: input.providers,
      models: input.models,
      capability: "vision",
    }),
    quality: resolveEnvOrCapabilityRuntime({
      envCode: input.env?.MATERIAL_PLAN_QUALITY_MODEL_CODE,
      providers: input.providers,
      models: input.models,
      capability: "quality_check",
    }),
  }
}

export async function resolveMaterialPipelineModels() {
  const [providers, models] = await Promise.all([
    loadAIProvidersSnapshot<AIProviderRow>(),
    loadAIModelsSnapshot<AIModelRow>(),
  ])

  return resolveMaterialPipelineModelsFromSnapshots({
    providers,
    models,
    env: {
      MATERIAL_PLAN_ASR_MODEL_CODE: process.env.MATERIAL_PLAN_ASR_MODEL_CODE,
      MATERIAL_PLAN_VISION_MODEL_CODE: process.env.MATERIAL_PLAN_VISION_MODEL_CODE,
      MATERIAL_PLAN_QUALITY_MODEL_CODE: process.env.MATERIAL_PLAN_QUALITY_MODEL_CODE,
    },
  })
}

export async function invokeMaterialPipelineModel(input: {
  runtime: MaterialPipelineRuntime
  systemPrompt: string
  userPrompt?: string
  userContent?: AIChatContentPart[]
  temperature?: number
  maxOutputTokens?: number
}) {
  const userContent = input.userContent ?? [{ type: "text", text: input.userPrompt ?? "" }]
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: input.systemPrompt,
    },
    {
      role: "user",
      content: userContent,
    },
  ]

  return invokeAIProvider({
    provider: input.runtime.provider,
    model: {
      code: input.runtime.model.code,
      modelName: input.runtime.model.modelName,
    },
    messages,
    temperature:
      input.temperature
      ?? input.runtime.model.recommendedTemperature
      ?? 0,
    maxOutputTokens:
      input.maxOutputTokens
      ?? input.runtime.model.defaultMaxOutputTokens
      ?? 1500,
  })
}

export async function invokeMaterialAudioTranscription(input: {
  runtime: MaterialPipelineRuntime
  mediaUrl: string
  prompt?: string
}) {
  function isQwen3AsrModel(modelName: string) {
    return modelName.toLowerCase() === "qwen3-asr-flash"
  }

  function buildMediaDownloadHeaders(mediaUrl: string) {
    const headers = new Headers({
      "User-Agent": "CodeTutorMaterialBot/1.0 (+https://example.com)",
    })

    try {
      const url = new URL(mediaUrl)
      if (url.hostname.includes("bilivideo.com")) {
        headers.set("Referer", "https://www.bilibili.com/")
        headers.set("Origin", "https://www.bilibili.com")
      }
    } catch {
      // Ignore invalid URLs here and let fetch raise the actual error.
    }

    return headers
  }

  function normalizeAudioMimeType(mediaUrl: string, contentType: string) {
    const normalized = contentType.toLowerCase()
    if (normalized !== "application/octet-stream") {
      return normalized
    }

    const pathname = (() => {
      try {
        return new URL(mediaUrl).pathname.toLowerCase()
      } catch {
        return ""
      }
    })()

    if (pathname.endsWith(".m4s") || pathname.endsWith(".mp4") || pathname.endsWith(".m4a")) {
      return "audio/mp4"
    }
    if (pathname.endsWith(".wav")) {
      return "audio/wav"
    }
    if (pathname.endsWith(".webm")) {
      return "audio/webm"
    }

    return normalized
  }

  function inferFileExtension(mediaUrl: string, contentType: string) {
    const pathname = (() => {
      try {
        return new URL(mediaUrl).pathname.toLowerCase()
      } catch {
        return ""
      }
    })()

    if (pathname.endsWith(".m4s") || pathname.endsWith(".mp4") || pathname.endsWith(".m4a")) {
      return "mp4"
    }
    if (pathname.endsWith(".wav")) {
      return "wav"
    }
    if (pathname.endsWith(".webm")) {
      return "webm"
    }
    if (contentType.includes("mp4")) {
      return "mp4"
    }
    if (contentType.includes("wav")) {
      return "wav"
    }
    if (contentType.includes("webm")) {
      return "webm"
    }

    return "mp3"
  }

  function toQwenAsrAudioFormat(contentType: string, extension: string) {
    const normalized = contentType.toLowerCase()
    if (normalized.includes("wav")) {
      return "wav"
    }
    if (normalized.includes("webm")) {
      return "webm"
    }
    if (normalized.includes("mp4") || normalized.includes("m4a") || extension === "mp4") {
      return "mp4"
    }
    if (normalized.includes("mpeg") || normalized.includes("mp3")) {
      return "mp3"
    }

    return extension
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, input.runtime.provider.timeoutMs)

  try {
    const resolved = resolveProviderSecret({
      secret_ref: input.runtime.provider.envSecretRef,
      secret_ciphertext: input.runtime.provider.secretCiphertext,
      secret_iv: input.runtime.provider.secretIv,
      secret_auth_tag: input.runtime.provider.secretAuthTag,
      secret_key_version: input.runtime.provider.secretKeyVersion,
    })

    if (!resolved.secret) {
      throw new LearningAIProviderError(`Missing required provider secret for ${input.runtime.provider.code}`)
    }

    const mediaResponse = await fetch(input.mediaUrl, {
      signal: controller.signal,
      headers: buildMediaDownloadHeaders(input.mediaUrl),
    })

    if (!mediaResponse.ok) {
      throw new LearningAIProviderError(`Failed to download media asset with status ${mediaResponse.status}`)
    }

    const contentType = normalizeAudioMimeType(
      input.mediaUrl,
      mediaResponse.headers.get("content-type") ?? "audio/mpeg",
    )
    const buffer = await mediaResponse.arrayBuffer()
    const extension = inferFileExtension(input.mediaUrl, contentType)

    const headers = new Headers()
    if (input.runtime.provider.authMode === "bearer") {
      headers.set("Authorization", `Bearer ${resolved.secret}`)
    } else {
      headers.set("x-api-key", resolved.secret)
    }

    if (isQwen3AsrModel(input.runtime.model.modelName)) {
      headers.set("Content-Type", "application/json")

      const response = await fetch(`${input.runtime.provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: input.runtime.model.modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`,
                    format: toQwenAsrAudioFormat(contentType, extension),
                  },
                },
              ],
            },
          ],
          stream: false,
          asr_options: {
            enable_itn: false,
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 400)
        throw new LearningAIProviderError(
          `ASR request failed with status ${response.status}: ${errorText}`,
        )
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | Array<{ type?: string; text?: string }>
          }
        }>
      }

      const content = payload.choices?.[0]?.message?.content
      const text = typeof content === "string"
        ? content.trim()
        : Array.isArray(content)
          ? content.map((item) => (item?.type === "text" ? item.text ?? "" : "")).join("").trim()
          : ""

      return {
        text,
      }
    }

    const form = new FormData()
    form.append("file", new Blob([buffer], { type: contentType }), `material.${extension}`)
    form.append("model", input.runtime.model.modelName)
    form.append("response_format", "json")
    if (input.prompt?.trim()) {
      form.append("prompt", input.prompt.trim())
    }

    const response = await fetch(`${input.runtime.provider.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 400)
      throw new LearningAIProviderError(
        `ASR request failed with status ${response.status}: ${errorText}`,
      )
    }

    const payload = (await response.json()) as {
      text?: string
    }

    return {
      text: payload.text?.trim() ?? "",
    }
  } catch (error) {
    if (error instanceof LearningAIProviderError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LearningAIProviderError("ASR request timed out")
    }

    throw new LearningAIProviderError(
      error instanceof Error ? error.message : "Unknown ASR provider error",
    )
  } finally {
    clearTimeout(timeout)
  }
}
