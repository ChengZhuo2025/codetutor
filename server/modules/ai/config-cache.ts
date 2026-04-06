import { performance } from "node:perf_hooks"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { markConfigCacheStatus, recordServerTiming } from "@/server/lib/observability"
import { createRuntimeCache } from "@/server/lib/runtime-cache"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type AIConfigCacheGroup =
  | "providers"
  | "models"
  | "agents"
  | "agent-bindings"
  | "skills"
  | "agent-skill-bindings"

const AI_CONFIG_CACHE_TTL_MS = 120_000
const AI_CONFIG_CACHE_MAX_ENTRIES = 1

const providersCache = createRuntimeCache<unknown[]>({
  name: "ai-providers",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

const modelsCache = createRuntimeCache<unknown[]>({
  name: "ai-models",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

const agentsCache = createRuntimeCache<unknown[]>({
  name: "ai-agents",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

const agentBindingsCache = createRuntimeCache<unknown[]>({
  name: "ai-agent-bindings",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

const skillsCache = createRuntimeCache<unknown[]>({
  name: "ai-skills",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

const agentSkillBindingsCache = createRuntimeCache<unknown[]>({
  name: "ai-agent-skill-bindings",
  ttlMs: AI_CONFIG_CACHE_TTL_MS,
  maxEntries: AI_CONFIG_CACHE_MAX_ENTRIES,
})

function cacheForGroup(group: AIConfigCacheGroup) {
  switch (group) {
    case "providers":
      return providersCache
    case "models":
      return modelsCache
    case "agents":
      return agentsCache
    case "agent-bindings":
      return agentBindingsCache
    case "skills":
      return skillsCache
    case "agent-skill-bindings":
      return agentSkillBindingsCache
  }
}

async function loadConfigSnapshot<Row>(
  group: AIConfigCacheGroup,
  loader: () => Promise<Row[]>,
): Promise<Row[]> {
  const cache = cacheForGroup(group)
  const startedAt = performance.now()
  const result = await cache.getOrLoadDetailed("all", loader)

  markConfigCacheStatus(result.status)
  recordServerTiming(`config_${group.replace(/[^a-z0-9]+/gi, "_")}`, performance.now() - startedAt)

  return result.value as Row[]
}

export async function loadAIProvidersSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("providers", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("ai_providers").select("*").order("updated_at", { ascending: false })
    assertSupabaseSuccess(error, "failed to query ai providers")
    return (data ?? []) as Row[]
  })
}

export async function loadAIModelsSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("models", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("ai_models").select("*").order("updated_at", { ascending: false })
    assertSupabaseSuccess(error, "failed to query ai models")
    return (data ?? []) as Row[]
  })
}

export async function loadAIAgentsSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("agents", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("agent_templates").select("*").order("updated_at", { ascending: false })
    assertSupabaseSuccess(error, "failed to query agent templates")
    return (data ?? []) as Row[]
  })
}

export async function loadAIAgentBindingsSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("agent-bindings", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("agent_bindings").select("*").order("priority", { ascending: true })
    assertSupabaseSuccess(error, "failed to query agent bindings")
    return (data ?? []) as Row[]
  })
}

export async function loadAISkillsSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("skills", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("skill_packs").select("*").order("updated_at", { ascending: false })
    assertSupabaseSuccess(error, "failed to query skill packs")
    return (data ?? []) as Row[]
  })
}

export async function loadAIAgentSkillBindingsSnapshot<Row = Record<string, unknown>>(): Promise<Row[]> {
  return loadConfigSnapshot<Row>("agent-skill-bindings", async () => {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from("agent_skill_bindings").select("*").order("priority", { ascending: true })
    assertSupabaseSuccess(error, "failed to query agent skill bindings")
    return (data ?? []) as Row[]
  })
}

export function invalidateAIConfigCache(...groups: AIConfigCacheGroup[]) {
  for (const group of groups) {
    cacheForGroup(group).clear()
  }
}
