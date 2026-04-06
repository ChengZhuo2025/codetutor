import "server-only"

import {
  loadAIAgentsSnapshot,
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import { invokeAIProvider } from "@/server/modules/learning/provider.ts"
import type { AIChatMessage } from "@/server/modules/learning/provider.ts"

export const MATERIAL_PLAN_AGENT_CODE = "self-study-material-planner"

type AgentTemplateRow = {
  code: string
  system_prompt_template: string
  developer_prompt_template: string | null
  default_provider_code: string
  default_model_code: string
  context_message_limit: number
  max_output_tokens: number
  temperature: number
  is_active: boolean
}

type ProviderRow = {
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

type ModelRow = {
  code: string
  model_name: string
  is_active: boolean
}

export async function loadPlannerAgentAndProvider() {
  const agent =
    (await loadAIAgentsSnapshot<AgentTemplateRow>())
      .find((item) => item.code === MATERIAL_PLAN_AGENT_CODE && item.is_active) ?? null
  if (!agent) {
    throw new Error("planner agent self-study-material-planner not configured")
  }

  const providerData =
    (await loadAIProvidersSnapshot<ProviderRow>())
      .find((item) => item.code === agent.default_provider_code && item.is_active) ?? null

  const modelData =
    (await loadAIModelsSnapshot<ModelRow>())
      .find((item) => item.code === agent.default_model_code && item.is_active) ?? null

  if (!providerData || !modelData) {
    throw new Error("planner provider or model missing")
  }

  return {
    agent,
    provider: providerData as ProviderRow,
    model: modelData as ModelRow,
  }
}

export async function invokePlannerModel(userContent: string) {
  const { agent, provider, model } = await loadPlannerAgentAndProvider()

  const systemParts = [
    agent.system_prompt_template,
    agent.developer_prompt_template ?? "",
  ].filter(Boolean)

  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: systemParts.join("\n\n"),
    },
    {
      role: "user",
      content: userContent,
    },
  ]

  return invokeAIProvider({
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
    },
    messages,
    temperature: Number(agent.temperature),
    maxOutputTokens: agent.max_output_tokens,
  })
}
