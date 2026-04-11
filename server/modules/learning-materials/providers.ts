import "server-only"

import {
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import {
  invokeAIProvider,
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
    model.is_active && model.metadata?.capabilities?.includes(capability)
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
  userPrompt: string
  temperature?: number
  maxOutputTokens?: number
}) {
  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: input.systemPrompt,
    },
    {
      role: "user",
      content: input.userPrompt,
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
