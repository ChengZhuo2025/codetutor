import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
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
}

type ModelRow = {
  code: string
  model_name: string
}

export async function loadPlannerAgentAndProvider() {
  const supabase = createSupabaseAdminClient()

  const { data: agentData, error: agentError } = await supabase
    .from("agent_templates")
    .select(
      "code, system_prompt_template, developer_prompt_template, default_provider_code, default_model_code, context_message_limit, max_output_tokens, temperature",
    )
    .eq("code", MATERIAL_PLAN_AGENT_CODE)
    .eq("is_active", true)
    .maybeSingle()

  assertSupabaseSuccess(agentError, "failed to load planner agent")
  const agent = agentData as AgentTemplateRow | null
  if (!agent) {
    throw new Error("planner agent self-study-material-planner not configured")
  }

  const { data: providerData, error: providerError } = await supabase
    .from("ai_providers")
    .select("code, provider_type, base_url, auth_mode, secret_ref, secret_ciphertext, secret_iv, secret_auth_tag, secret_key_version, timeout_ms, retry_count")
    .eq("code", agent.default_provider_code)
    .eq("is_active", true)
    .maybeSingle()

  assertSupabaseSuccess(providerError, "failed to load ai provider for planner")

  const { data: modelData, error: modelError } = await supabase
    .from("ai_models")
    .select("code, model_name")
    .eq("code", agent.default_model_code)
    .eq("is_active", true)
    .maybeSingle()

  assertSupabaseSuccess(modelError, "failed to load ai model for planner")

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
