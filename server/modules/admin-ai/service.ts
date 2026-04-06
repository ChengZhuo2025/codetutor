import type {
  AdminAIAgentBindingListItem,
  AdminAIAgentBindingListResponseData,
  AdminAIAgentDetailResponseData,
  AdminAIAgentListItem,
  AdminAIAgentListResponseData,
  AdminAIAgentSkillBindingListItem,
  AdminAIAgentSkillBindingListResponseData,
  AdminAIAgentSkillBindingUpsertRequest,
  AdminAIAgentUpsertRequest,
  AdminAIAgentBindingUpsertRequest,
  AdminAIInvocationDetailResponseData,
  AdminAIInvocationListItem,
  AdminAIInvocationListResponseData,
  AdminAIModelDetailResponseData,
  AdminAIModelListItem,
  AdminAIModelListResponseData,
  AdminAIModelUpsertRequest,
  AdminAIOverviewResponseData,
  AdminAIProviderDetailResponseData,
  AdminAIProviderListItem,
  AdminAIProviderListResponseData,
  AdminAIProviderSecretRevealResponseData,
  AdminAIProviderUpsertRequest,
  AdminAIResolvePreviewRequest,
  AdminAIResolvePreviewResponseData,
  AdminAISkillListItem,
  AdminAISkillListResponseData,
  AdminAITestRequest,
  AdminAITestResponseData,
} from "@/lib/api/contracts/admin-ai"
import type { AdminAuditAction, AdminRoleCode } from "@/lib/api/contracts/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { isUuid } from "@/server/lib/identifiers"
import {
  encryptProviderSecret,
  getProviderSecretPresentation,
  hasStoredProviderSecret,
  resolveProviderSecret,
} from "@/server/lib/secrets/provider-secret"
import { invokeAIProvider, streamAIProvider } from "@/server/modules/learning/provider.ts"

type AdminActorRow = {
  id: string
  user_id: string
  display_name: string
  status: string
  admin_account_roles: Array<{
    admin_roles: {
      code: AdminRoleCode
    } | null
  }>
}

type ProviderRow = {
  id: string
  code: string
  name: string
  provider_type: "siliconflow" | "openai_compatible" | "anthropic"
  base_url: string
  auth_mode: "bearer" | "api_key_header"
  secret_ref: string | null
  secret_ciphertext: string | null
  secret_iv: string | null
  secret_auth_tag: string | null
  secret_key_version: string | null
  secret_last_updated_at: string | null
  supports_stream: boolean
  supports_json_mode: boolean
  timeout_ms: number
  retry_count: number
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type ModelRow = {
  id: string
  provider_id: string
  code: string
  display_name: string
  model_name: string
  supports_stream: boolean
  supports_json_mode: boolean
  supports_tool_calling: boolean
  max_context_tokens: number
  default_max_output_tokens: number
  recommended_temperature: number | null
  pricing_metadata: Record<string, unknown>
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type AgentRow = {
  id: string
  code: string
  name: string
  scenario_type: "teaching" | "blocked_help" | "task_review" | "completion_feedback" | "path_guidance"
  description: string | null
  system_prompt_template: string
  developer_prompt_template: string | null
  default_provider_code: string
  default_model_code: string
  context_message_limit: number
  max_output_tokens: number
  temperature: number
  top_p: number | null
  stream_enabled: boolean
  is_active: boolean
  version: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type ToolRow = {
  id: string
  code: string
  name: string
}

type PathRow = {
  id: string
  code: string
  name: string
}

type AgentBindingRow = {
  id: string
  agent_code: string
  tool_id: string | null
  learning_level: "beginner" | "intermediate" | "advanced" | null
  selection_mode: "self_directed" | "preset_training" | null
  path_id: string | null
  step_no: number | null
  interaction_type: string
  priority: number
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type SkillRow = {
  id: string
  code: string
  name: string
  version: string
  source_type: "built_in" | "imported" | "custom"
  trust_level: "internal_verified" | "reviewed_external" | "untrusted"
  root_path: string
  manifest_path: string
  entry_resource_path: string | null
  scripts_enabled: boolean
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type AgentSkillBindingRow = {
  id: string
  agent_code: string
  skill_code: string
  priority: number
  is_required: boolean
  context_budget_tokens: number | null
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type InvocationRow = {
  id: string
  session_id: string
  assistant_message_id: string | null
  user_message_id: string | null
  user_id: string
  provider_code: string
  model_code: string
  agent_code: string
  status: "streaming" | "succeeded" | "failed" | "cancelled" | "timed_out"
  stream_enabled: boolean
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  latency_ms: number | null
  first_chunk_latency_ms: number | null
  finish_reason: string | null
  error_code: string | null
  error_message: string | null
  request_payload_redacted: Record<string, unknown>
  response_payload_redacted: Record<string, unknown>
  created_at: string
}

type SessionInsertResult = {
  id: string
}

const AI_ALLOWED_ROLES = new Set<AdminRoleCode>(["super_admin", "ai_ops_admin"])

function filterByKeyword(keyword: string | undefined, candidates: Array<string | null | undefined>) {
  const normalized = keyword?.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return candidates.some((value) => (value ?? "").toLowerCase().includes(normalized))
}

function normalizeRoles(row: AdminActorRow): AdminRoleCode[] {
  return (row.admin_account_roles ?? [])
    .map((item) => item.admin_roles?.code)
    .filter((value): value is AdminRoleCode => Boolean(value))
}

function throwNamedError(name: "FORBIDDEN" | "CONFLICT" | "VALIDATION_FAILED" | "NOT_FOUND", message: string): never {
  const error = new Error(message)
  error.name = name
  throw error
}

async function loadAdminActor(adminAccountId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_accounts")
    .select(`
      id,
      user_id,
      display_name,
      status,
      admin_account_roles(
        admin_roles(
          code
        )
      )
    `)
    .eq("id", adminAccountId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin actor")
  return (data ?? null) as unknown as AdminActorRow | null
}

async function assertCanAccessAI(adminAccountId: string) {
  const actor = await loadAdminActor(adminAccountId)
  if (!actor) {
    throwNamedError("FORBIDDEN", "当前管理员不存在。")
  }

  const roles = normalizeRoles(actor)
  if (!roles.some((role) => AI_ALLOWED_ROLES.has(role))) {
    throwNamedError("FORBIDDEN", "仅超级管理员或 AI 运营管理员可访问 AI 运营模块。")
  }

  return {
    ...actor,
    roles,
  }
}

async function writeAdminAIAudit(input: {
  adminAccountId: string
  action: AdminAuditAction
  targetType: string
  targetId?: string | null
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
  reason?: string | null
  requestContext?: Record<string, unknown> | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    reason: input.reason ?? null,
    request_context: input.requestContext ?? null,
  })

  if (error) {
    console.error("Failed to write admin ai audit log:", error)
  }
}

async function loadProviders() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("ai_providers").select("*").order("updated_at", { ascending: false })
  assertSupabaseSuccess(error, "failed to query ai providers")
  return (data ?? []) as ProviderRow[]
}

async function loadModels() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("ai_models").select("*").order("updated_at", { ascending: false })
  assertSupabaseSuccess(error, "failed to query ai models")
  return (data ?? []) as ModelRow[]
}

async function loadAgents() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("agent_templates").select("*").order("updated_at", { ascending: false })
  assertSupabaseSuccess(error, "failed to query agent templates")
  return (data ?? []) as AgentRow[]
}

async function loadAgentBindings() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("agent_bindings").select("*").order("priority", { ascending: true })
  assertSupabaseSuccess(error, "failed to query agent bindings")
  return (data ?? []) as AgentBindingRow[]
}

async function loadSkills() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("skill_packs").select("*").order("updated_at", { ascending: false })
  assertSupabaseSuccess(error, "failed to query skill packs")
  return (data ?? []) as SkillRow[]
}

async function loadAgentSkillBindings() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("agent_skill_bindings").select("*").order("priority", { ascending: true })
  assertSupabaseSuccess(error, "failed to query agent skill bindings")
  return (data ?? []) as AgentSkillBindingRow[]
}

async function loadInvocations() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("llm_invocations").select("*").order("created_at", { ascending: false })
  assertSupabaseSuccess(error, "failed to query llm invocations")
  return (data ?? []) as InvocationRow[]
}

async function loadTools() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("learning_tools").select("id, code, name").order("name", { ascending: true })
  assertSupabaseSuccess(error, "failed to query learning tools")
  return (data ?? []) as ToolRow[]
}

async function loadPaths() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("learning_paths").select("id, code, name").order("name", { ascending: true })
  assertSupabaseSuccess(error, "failed to query learning paths")
  return (data ?? []) as PathRow[]
}

function mapProviderListItem(
  row: ProviderRow,
  models: ModelRow[],
): AdminAIProviderListItem {
  const secretPresentation = getProviderSecretPresentation(row)

  return {
    providerId: row.id,
    code: row.code,
    name: row.name,
    providerType: row.provider_type,
    baseUrl: row.base_url,
    authMode: row.auth_mode,
    secretSource: secretPresentation.secretSource,
    secretMasked: secretPresentation.secretMasked,
    envSecretRef: secretPresentation.envSecretRef,
    hasStoredSecret: secretPresentation.hasStoredSecret,
    supportsStream: row.supports_stream,
    supportsJsonMode: row.supports_json_mode,
    timeoutMs: row.timeout_ms,
    retryCount: row.retry_count,
    isActive: row.is_active,
    modelCount: models.filter((model) => model.provider_id === row.id).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function findProviderByIdentifier(providers: ProviderRow[], providerIdentifier: string) {
  return providers.find((row) => row.id === providerIdentifier || row.code === providerIdentifier) ?? null
}

function buildProviderSecretWriteFields(
  input: AdminAIProviderUpsertRequest,
  existing: ProviderRow | null,
) {
  const envSecretRef = input.envSecretRef?.trim() || null

  if (input.apiKey) {
    if (!process.env.AI_PROVIDER_SECRET_ENCRYPTION_KEY?.trim()) {
      throwNamedError(
        "VALIDATION_FAILED",
        "服务端缺少 AI_PROVIDER_SECRET_ENCRYPTION_KEY，无法加密保存 Provider API Key。请先配置该环境变量并重启服务。",
      )
    }

    return {
      secret_ref: envSecretRef,
      ...encryptProviderSecret(input.apiKey),
      secret_last_updated_at: new Date().toISOString(),
    }
  }

  if (input.keepExistingSecret && existing && hasStoredProviderSecret(existing)) {
    return {
      secret_ref: envSecretRef,
      secret_ciphertext: existing.secret_ciphertext,
      secret_iv: existing.secret_iv,
      secret_auth_tag: existing.secret_auth_tag,
      secret_key_version: existing.secret_key_version,
      secret_last_updated_at: existing.secret_last_updated_at,
    }
  }

  return {
    secret_ref: envSecretRef,
    secret_ciphertext: null,
    secret_iv: null,
    secret_auth_tag: null,
    secret_key_version: existing?.secret_key_version ?? null,
    secret_last_updated_at: existing?.secret_last_updated_at ?? null,
  }
}

/** 路由参数可为 UUID（id）或业务 code（与 `ai_models.code` 唯一约束一致） */
function resolveModelRow(models: ModelRow[], modelIdOrCode: string): ModelRow | null {
  const key = modelIdOrCode.trim()
  if (!key) {
    return null
  }
  if (isUuid(key)) {
    const byId = models.find((row) => row.id === key)
    if (byId) {
      return byId
    }
  }
  return models.find((row) => row.code === key) ?? null
}

function mapModelListItem(
  row: ModelRow,
  providerById: Map<string, ProviderRow>,
  agents: AgentRow[],
): AdminAIModelListItem {
  return {
    modelId: row.id,
    providerId: row.provider_id,
    providerCode: providerById.get(row.provider_id)?.code ?? "",
    code: row.code,
    displayName: row.display_name,
    modelName: row.model_name,
    supportsStream: row.supports_stream,
    supportsJsonMode: row.supports_json_mode,
    supportsToolCalling: row.supports_tool_calling,
    maxContextTokens: row.max_context_tokens,
    defaultMaxOutputTokens: row.default_max_output_tokens,
    recommendedTemperature: row.recommended_temperature,
    isActive: row.is_active,
    linkedAgentCount: agents.filter((agent) => agent.default_model_code === row.code).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAgentBindingItem(
  row: AgentBindingRow,
  agentByCode: Map<string, AgentRow>,
  toolById: Map<string, ToolRow>,
  pathById: Map<string, PathRow>,
): AdminAIAgentBindingListItem {
  const tool = row.tool_id ? toolById.get(row.tool_id) ?? null : null
  const path = row.path_id ? pathById.get(row.path_id) ?? null : null
  const agent = agentByCode.get(row.agent_code) ?? null
  return {
    bindingId: row.id,
    agentCode: row.agent_code,
    agentName: agent?.name ?? row.agent_code,
    toolId: row.tool_id,
    toolCode: tool?.code ?? null,
    toolName: tool?.name ?? null,
    learningLevel: row.learning_level,
    selectionMode: row.selection_mode,
    pathId: row.path_id,
    pathCode: path?.code ?? null,
    pathName: path?.name ?? null,
    stepNo: row.step_no,
    interactionType: row.interaction_type,
    priority: row.priority,
    isActive: row.is_active,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAgentSkillBindingItem(
  row: AgentSkillBindingRow,
  agentByCode: Map<string, AgentRow>,
  skillByCode: Map<string, SkillRow>,
): AdminAIAgentSkillBindingListItem {
  return {
    bindingId: row.id,
    agentCode: row.agent_code,
    agentName: agentByCode.get(row.agent_code)?.name ?? row.agent_code,
    skillCode: row.skill_code,
    skillName: skillByCode.get(row.skill_code)?.name ?? row.skill_code,
    priority: row.priority,
    isRequired: row.is_required,
    contextBudgetTokens: row.context_budget_tokens,
    isActive: row.is_active,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAgentListItem(
  row: AgentRow,
  bindings: AgentBindingRow[],
  skillBindings: AgentSkillBindingRow[],
): AdminAIAgentListItem {
  return {
    agentId: row.id,
    code: row.code,
    name: row.name,
    scenarioType: row.scenario_type,
    providerCode: row.default_provider_code,
    modelCode: row.default_model_code,
    streamEnabled: row.stream_enabled,
    isActive: row.is_active,
    bindingCount: bindings.filter((binding) => binding.agent_code === row.code).length,
    skillCount: skillBindings.filter((binding) => binding.agent_code === row.code).length,
    updatedAt: row.updated_at,
  }
}

function mapSkillListItem(
  row: SkillRow,
  skillBindings: AgentSkillBindingRow[],
): AdminAISkillListItem {
  return {
    skillId: row.id,
    code: row.code,
    name: row.name,
    version: row.version,
    sourceType: row.source_type,
    trustLevel: row.trust_level,
    rootPath: row.root_path,
    manifestPath: row.manifest_path,
    entryResourcePath: row.entry_resource_path,
    scriptsEnabled: row.scripts_enabled,
    isActive: row.is_active,
    metadata: row.metadata ?? {},
    linkedAgentCount: skillBindings.filter((binding) => binding.skill_code === row.code).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInvocationListItem(row: InvocationRow): AdminAIInvocationListItem {
  return {
    invocationId: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    providerCode: row.provider_code,
    modelCode: row.model_code,
    agentCode: row.agent_code,
    status: row.status,
    streamEnabled: row.stream_enabled,
    totalTokens: row.total_tokens,
    latencyMs: row.latency_ms,
    finishReason: row.finish_reason,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }
}

function paginate<T>(items: T[], page: number, limit: number) {
  const normalizedPage = page > 0 ? page : 1
  const from = (normalizedPage - 1) * limit
  const to = from + limit
  return {
    items: items.slice(from, to),
    total: items.length,
    page: normalizedPage,
    limit,
  }
}

function mapWriteError(error: { message?: string; code?: string } | null, duplicateLabel: string) {
  if (error?.code === "23505" || error?.message?.includes("duplicate")) {
    throwNamedError("CONFLICT", `${duplicateLabel} 已存在。`)
  }
  if (error?.message?.includes("violates foreign key constraint")) {
    throwNamedError("VALIDATION_FAILED", "关联配置不存在或已失效。")
  }
  if (error) {
    throw new Error(`supabase write failed: ${error.message ?? "unknown error"}`)
  }
}

async function loadProviderByCode(code: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("ai_providers").select("*").eq("code", code).maybeSingle()
  assertSupabaseSuccess(error, "failed to query provider by code")
  return (data ?? null) as ProviderRow | null
}

async function loadModelByCode(code: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("ai_models").select("*").eq("code", code).maybeSingle()
  assertSupabaseSuccess(error, "failed to query model by code")
  return (data ?? null) as ModelRow | null
}

async function loadAgentByCode(code: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("agent_templates").select("*").eq("code", code).maybeSingle()
  assertSupabaseSuccess(error, "failed to query agent by code")
  return (data ?? null) as AgentRow | null
}

async function loadSkillByCode(code: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("skill_packs").select("*").eq("code", code).maybeSingle()
  assertSupabaseSuccess(error, "failed to query skill by code")
  return (data ?? null) as SkillRow | null
}

function scoreBindingSpecificity(binding: Pick<AgentBindingRow, "tool_id" | "learning_level" | "selection_mode" | "path_id" | "step_no">) {
  return [
    binding.tool_id,
    binding.learning_level,
    binding.selection_mode,
    binding.path_id,
    binding.step_no,
  ].filter((value) => value !== null).length
}

function resolvePreviewBinding(
  bindings: AgentBindingRow[],
  input: AdminAIResolvePreviewRequest,
) {
  const candidates = bindings
    .filter((binding) => binding.is_active)
    .filter((binding) => {
      if (binding.interaction_type !== input.interactionType) {
        return false
      }
      if (binding.tool_id && binding.tool_id !== input.toolId) {
        return false
      }
      if (binding.learning_level && binding.learning_level !== input.learningLevel) {
        return false
      }
      if (binding.selection_mode && binding.selection_mode !== input.selectionMode) {
        return false
      }
      if (binding.path_id && binding.path_id !== input.pathId) {
        return false
      }
      if (binding.step_no && binding.step_no !== input.stepNo) {
        return false
      }
      return true
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority
      }
      return scoreBindingSpecificity(right) - scoreBindingSpecificity(left)
    })

  return candidates[0] ?? null
}

export async function getAdminAIOverview(adminAccountId: string): Promise<AdminAIOverviewResponseData> {
  await assertCanAccessAI(adminAccountId)

  const [providers, models, agents, skills, invocations] = await Promise.all([
    loadProviders(),
    loadModels(),
    loadAgents(),
    loadSkills(),
    loadInvocations(),
  ])

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  const last7dInvocations = invocations.filter((item) => new Date(item.created_at).getTime() >= since)
  const failedStatuses = new Set(["failed", "timed_out", "cancelled"])

  const topAgentCounts = new Map<string, { count: number; failed: number }>()
  for (const row of last7dInvocations) {
    const next = topAgentCounts.get(row.agent_code) ?? { count: 0, failed: 0 }
    next.count += 1
    if (failedStatuses.has(row.status)) {
      next.failed += 1
    }
    topAgentCounts.set(row.agent_code, next)
  }

  const agentByCode = new Map(agents.map((row) => [row.code, row]))

  return {
    permissions: {
      canView: true,
      canManage: true,
    },
    stats: {
      totalProviders: providers.length,
      activeProviders: providers.filter((row) => row.is_active).length,
      totalModels: models.length,
      activeModels: models.filter((row) => row.is_active).length,
      totalAgents: agents.length,
      activeAgents: agents.filter((row) => row.is_active).length,
      totalSkills: skills.length,
      activeSkills: skills.filter((row) => row.is_active).length,
      invocationCountLast7Days: last7dInvocations.length,
      failedInvocationCountLast7Days: last7dInvocations.filter((row) => failedStatuses.has(row.status)).length,
      successRateLast7Days:
        last7dInvocations.length > 0
          ? Number((last7dInvocations.filter((row) => row.status === "succeeded").length / last7dInvocations.length).toFixed(4))
          : 0,
    },
    topAgents: Array.from(topAgentCounts.entries())
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, 5)
      .map(([agentCode, value]) => ({
        agentCode,
        agentName: agentByCode.get(agentCode)?.name ?? agentCode,
        invocationCount: value.count,
        failedInvocationCount: value.failed,
      })),
    recentFailures: last7dInvocations
      .filter((row) => failedStatuses.has(row.status))
      .slice(0, 5)
      .map((row) => ({
        invocationId: row.id,
        agentCode: row.agent_code,
        providerCode: row.provider_code,
        modelCode: row.model_code,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      })),
  }
}

export async function getAdminAIProviderList(filters: {
  adminAccountId: string
  keyword?: string
  status: "all" | "active" | "inactive"
  page: number
  limit: number
}): Promise<AdminAIProviderListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [providers, models] = await Promise.all([loadProviders(), loadModels()])

  const filtered = providers
    .map((row) => mapProviderListItem(row, models))
    .filter((row) => {
      if (filters.status === "active" && !row.isActive) {
        return false
      }
      if (filters.status === "inactive" && row.isActive) {
        return false
      }
      return filterByKeyword(filters.keyword, [row.code, row.name, row.baseUrl, row.envSecretRef, row.secretSource])
    })

  return paginate(filtered, filters.page, filters.limit)
}

export async function getAdminAIProviderDetail(
  adminAccountId: string,
  providerId: string,
): Promise<AdminAIProviderDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)

  const [providers, models, agents] = await Promise.all([loadProviders(), loadModels(), loadAgents()])
  const provider = findProviderByIdentifier(providers, providerId)
  if (!provider) {
    return null
  }

  const secretPresentation = getProviderSecretPresentation(provider)

  return {
    provider: {
      providerId: provider.id,
      code: provider.code,
      name: provider.name,
      providerType: provider.provider_type,
      baseUrl: provider.base_url,
      authMode: provider.auth_mode,
      secretSource: secretPresentation.secretSource,
      secretMasked: secretPresentation.secretMasked,
      envSecretRef: secretPresentation.envSecretRef,
      hasStoredSecret: secretPresentation.hasStoredSecret,
      supportsStream: provider.supports_stream,
      supportsJsonMode: provider.supports_json_mode,
      timeoutMs: provider.timeout_ms,
      retryCount: provider.retry_count,
      isActive: provider.is_active,
      metadata: provider.metadata ?? {},
      createdAt: provider.created_at,
      updatedAt: provider.updated_at,
    },
    linkedModelCodes: models.filter((row) => row.provider_id === provider.id).map((row) => row.code),
    linkedAgentCodes: agents.filter((row) => row.default_provider_code === provider.code).map((row) => row.code),
  }
}

export async function createAdminAIProvider(
  adminAccountId: string,
  input: AdminAIProviderUpsertRequest,
): Promise<AdminAIProviderDetailResponseData> {
  await assertCanAccessAI(adminAccountId)
  const secretWriteFields = buildProviderSecretWriteFields(input, null)

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("ai_providers")
    .insert({
      code: input.code,
      name: input.name,
      provider_type: input.providerType,
      base_url: input.baseUrl,
      auth_mode: input.authMode,
      ...secretWriteFields,
      supports_stream: input.supportsStream,
      supports_json_mode: input.supportsJsonMode,
      timeout_ms: input.timeoutMs,
      retry_count: input.retryCount,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .select("id")
    .single()

  mapWriteError(error, "Provider code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_provider_create",
    targetType: "ai_provider",
    targetId: (data as { id: string }).id,
    beforeSnapshot: null,
    afterSnapshot: {
      code: input.code,
      name: input.name,
      providerType: input.providerType,
      secretSource: input.apiKey ? "database" : input.envSecretRef ? "env_fallback" : "missing",
      envSecretRef: input.envSecretRef,
      isActive: input.isActive,
    },
    reason: input.changeReason,
  })

  const detail = await getAdminAIProviderDetail(adminAccountId, (data as { id: string }).id)
  if (!detail) {
    throw new Error("created provider not found")
  }
  return detail
}

export async function updateAdminAIProvider(
  adminAccountId: string,
  providerId: string,
  input: AdminAIProviderUpsertRequest,
): Promise<AdminAIProviderDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)
  const existing = await getAdminAIProviderDetail(adminAccountId, providerId)
  if (!existing) {
    return null
  }
  const existingRow = findProviderByIdentifier(await loadProviders(), providerId)
  if (!existingRow) {
    return null
  }

  if (!input.isActive && existing.linkedAgentCodes.length > 0) {
    throwNamedError("CONFLICT", "当前 Provider 仍被 Agent 引用，不能直接停用。")
  }

  if (existing.linkedAgentCodes.length > 0 && input.code !== existing.provider.code) {
    throwNamedError(
      "CONFLICT",
      "当前 Provider 仍被 Agent 作为默认 Provider 引用，不能修改 Code。请先在 Agent 管理中调整默认 Provider 后再改。",
    )
  }

  const secretWriteFields = buildProviderSecretWriteFields(input, existingRow)
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("ai_providers")
    .update({
      code: input.code,
      name: input.name,
      provider_type: input.providerType,
      base_url: input.baseUrl,
      auth_mode: input.authMode,
      ...secretWriteFields,
      supports_stream: input.supportsStream,
      supports_json_mode: input.supportsJsonMode,
      timeout_ms: input.timeoutMs,
      retry_count: input.retryCount,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .eq("id", existing.provider.providerId)

  mapWriteError(error, "Provider code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_provider_update",
    targetType: "ai_provider",
    targetId: existing.provider.providerId,
    beforeSnapshot: existing.provider,
    afterSnapshot: {
      ...existing.provider,
      code: input.code,
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      authMode: input.authMode,
      secretSource: input.apiKey
        ? "database"
        : input.keepExistingSecret
          ? existing.provider.secretSource
          : input.envSecretRef
            ? "env_fallback"
            : "missing",
      secretMasked: existing.provider.secretMasked,
      envSecretRef: input.envSecretRef,
      hasStoredSecret: input.apiKey ? true : input.keepExistingSecret ? existing.provider.hasStoredSecret : false,
      supportsStream: input.supportsStream,
      supportsJsonMode: input.supportsJsonMode,
      timeoutMs: input.timeoutMs,
      retryCount: input.retryCount,
      isActive: input.isActive,
      metadata: input.metadata,
    },
    reason: input.changeReason,
  })

  return getAdminAIProviderDetail(adminAccountId, existing.provider.providerId)
}

export async function revealAdminAIProviderSecret(
  adminAccountId: string,
  providerId: string,
): Promise<AdminAIProviderSecretRevealResponseData | null> {
  await assertCanAccessAI(adminAccountId)

  const provider = findProviderByIdentifier(await loadProviders(), providerId)
  if (!provider) {
    return null
  }

  const resolved = resolveProviderSecret(provider)
  if (!resolved.secret) {
    throwNamedError("VALIDATION_FAILED", "当前 Provider 尚未配置可用 API Key。")
  }

  return {
    apiKey: resolved.secret,
    source: resolved.source,
  }
}

export async function getAdminAIModelList(filters: {
  adminAccountId: string
  keyword?: string
  status: "all" | "active" | "inactive"
  page: number
  limit: number
}): Promise<AdminAIModelListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [providers, models, agents] = await Promise.all([loadProviders(), loadModels(), loadAgents()])
  const providerById = new Map(providers.map((row) => [row.id, row]))

  const filtered = models
    .map((row) => mapModelListItem(row, providerById, agents))
    .filter((row) => {
      if (filters.status === "active" && !row.isActive) {
        return false
      }
      if (filters.status === "inactive" && row.isActive) {
        return false
      }
      return filterByKeyword(filters.keyword, [row.code, row.displayName, row.modelName, row.providerCode])
    })

  return paginate(filtered, filters.page, filters.limit)
}

export async function getAdminAIModelDetail(
  adminAccountId: string,
  modelId: string,
): Promise<AdminAIModelDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)

  const [providers, models, agents] = await Promise.all([loadProviders(), loadModels(), loadAgents()])
  const providerById = new Map(providers.map((row) => [row.id, row]))
  const model = resolveModelRow(models, modelId)
  if (!model) {
    return null
  }

  return {
    model: {
      modelId: model.id,
      providerId: model.provider_id,
      providerCode: providerById.get(model.provider_id)?.code ?? "",
      code: model.code,
      displayName: model.display_name,
      modelName: model.model_name,
      supportsStream: model.supports_stream,
      supportsJsonMode: model.supports_json_mode,
      supportsToolCalling: model.supports_tool_calling,
      maxContextTokens: model.max_context_tokens,
      defaultMaxOutputTokens: model.default_max_output_tokens,
      recommendedTemperature: model.recommended_temperature,
      pricingMetadata: model.pricing_metadata ?? {},
      isActive: model.is_active,
      metadata: model.metadata ?? {},
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    },
    linkedAgentCodes: agents.filter((row) => row.default_model_code === model.code).map((row) => row.code),
  }
}

export async function createAdminAIModel(
  adminAccountId: string,
  input: AdminAIModelUpsertRequest,
): Promise<AdminAIModelDetailResponseData> {
  await assertCanAccessAI(adminAccountId)

  const provider = await loadProviderByCode(input.providerCode)
  if (!provider) {
    throwNamedError("VALIDATION_FAILED", "Provider 不存在。")
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("ai_models")
    .insert({
      provider_id: provider.id,
      code: input.code,
      display_name: input.displayName,
      model_name: input.modelName,
      supports_stream: input.supportsStream,
      supports_json_mode: input.supportsJsonMode,
      supports_tool_calling: input.supportsToolCalling,
      max_context_tokens: input.maxContextTokens,
      default_max_output_tokens: input.defaultMaxOutputTokens,
      recommended_temperature: input.recommendedTemperature,
      pricing_metadata: input.pricingMetadata,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .select("id")
    .single()

  mapWriteError(error, "Model code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_model_create",
    targetType: "ai_model",
    targetId: (data as { id: string }).id,
    afterSnapshot: {
      code: input.code,
      providerCode: input.providerCode,
      displayName: input.displayName,
      isActive: input.isActive,
    },
    reason: input.changeReason,
  })

  const detail = await getAdminAIModelDetail(adminAccountId, (data as { id: string }).id)
  if (!detail) {
    throw new Error("created model not found")
  }
  return detail
}

export async function updateAdminAIModel(
  adminAccountId: string,
  modelId: string,
  input: AdminAIModelUpsertRequest,
): Promise<AdminAIModelDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)
  const existing = await getAdminAIModelDetail(adminAccountId, modelId)
  if (!existing) {
    return null
  }

  if (!input.isActive && existing.linkedAgentCodes.length > 0) {
    throwNamedError("CONFLICT", "当前 Model 仍被 Agent 引用，不能直接停用。")
  }

  const provider = await loadProviderByCode(input.providerCode)
  if (!provider) {
    throwNamedError("VALIDATION_FAILED", "Provider 不存在。")
  }

  const rowId = existing.model.modelId

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("ai_models")
    .update({
      provider_id: provider.id,
      code: input.code,
      display_name: input.displayName,
      model_name: input.modelName,
      supports_stream: input.supportsStream,
      supports_json_mode: input.supportsJsonMode,
      supports_tool_calling: input.supportsToolCalling,
      max_context_tokens: input.maxContextTokens,
      default_max_output_tokens: input.defaultMaxOutputTokens,
      recommended_temperature: input.recommendedTemperature,
      pricing_metadata: input.pricingMetadata,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .eq("id", rowId)

  mapWriteError(error, "Model code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_model_update",
    targetType: "ai_model",
    targetId: rowId,
    beforeSnapshot: existing.model,
    afterSnapshot: {
      ...existing.model,
      providerCode: input.providerCode,
      code: input.code,
      displayName: input.displayName,
      modelName: input.modelName,
      supportsStream: input.supportsStream,
      supportsJsonMode: input.supportsJsonMode,
      supportsToolCalling: input.supportsToolCalling,
      maxContextTokens: input.maxContextTokens,
      defaultMaxOutputTokens: input.defaultMaxOutputTokens,
      recommendedTemperature: input.recommendedTemperature,
      pricingMetadata: input.pricingMetadata,
      isActive: input.isActive,
      metadata: input.metadata,
    },
    reason: input.changeReason,
  })

  return getAdminAIModelDetail(adminAccountId, rowId)
}

export async function getAdminAIAgentList(filters: {
  adminAccountId: string
  keyword?: string
  scenarioType?: "teaching" | "blocked_help" | "task_review" | "completion_feedback" | "path_guidance"
  status: "all" | "active" | "inactive"
  page: number
  limit: number
}): Promise<AdminAIAgentListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [agents, bindings, skillBindings] = await Promise.all([
    loadAgents(),
    loadAgentBindings(),
    loadAgentSkillBindings(),
  ])

  const filtered = agents
    .map((row) => mapAgentListItem(row, bindings, skillBindings))
    .filter((row) => {
      if (filters.status === "active" && !row.isActive) {
        return false
      }
      if (filters.status === "inactive" && row.isActive) {
        return false
      }
      if (filters.scenarioType && row.scenarioType !== filters.scenarioType) {
        return false
      }
      return filterByKeyword(filters.keyword, [row.code, row.name, row.providerCode, row.modelCode])
    })

  return paginate(filtered, filters.page, filters.limit)
}

export async function getAdminAIAgentDetail(
  adminAccountId: string,
  agentId: string,
): Promise<AdminAIAgentDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)
  if (!isUuid(agentId)) {
    return null
  }

  const [agents, bindings, skillBindings, tools, paths, skills] = await Promise.all([
    loadAgents(),
    loadAgentBindings(),
    loadAgentSkillBindings(),
    loadTools(),
    loadPaths(),
    loadSkills(),
  ])

  const agent = agents.find((row) => row.id === agentId)
  if (!agent) {
    return null
  }

  const agentByCode = new Map(agents.map((row) => [row.code, row]))
  const toolById = new Map(tools.map((row) => [row.id, row]))
  const pathById = new Map(paths.map((row) => [row.id, row]))
  const skillByCode = new Map(skills.map((row) => [row.code, row]))

  return {
    agent: {
      agentId: agent.id,
      code: agent.code,
      name: agent.name,
      scenarioType: agent.scenario_type,
      description: agent.description,
      systemPromptTemplate: agent.system_prompt_template,
      developerPromptTemplate: agent.developer_prompt_template,
      defaultProviderCode: agent.default_provider_code,
      defaultModelCode: agent.default_model_code,
      contextMessageLimit: agent.context_message_limit,
      maxOutputTokens: agent.max_output_tokens,
      temperature: Number(agent.temperature),
      topP: agent.top_p == null ? null : Number(agent.top_p),
      streamEnabled: agent.stream_enabled,
      isActive: agent.is_active,
      metadata: agent.metadata ?? {},
      version: agent.version,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    },
    bindings: bindings
      .filter((row) => row.agent_code === agent.code)
      .map((row) => mapAgentBindingItem(row, agentByCode, toolById, pathById)),
    skillBindings: skillBindings
      .filter((row) => row.agent_code === agent.code)
      .map((row) => mapAgentSkillBindingItem(row, agentByCode, skillByCode)),
  }
}

export async function createAdminAIAgent(
  adminAccountId: string,
  input: AdminAIAgentUpsertRequest,
): Promise<AdminAIAgentDetailResponseData> {
  await assertCanAccessAI(adminAccountId)

  const [provider, model] = await Promise.all([
    loadProviderByCode(input.defaultProviderCode),
    loadModelByCode(input.defaultModelCode),
  ])

  if (!provider || !model) {
    throwNamedError("VALIDATION_FAILED", "默认 Provider 或 Model 不存在。")
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("agent_templates")
    .insert({
      code: input.code,
      name: input.name,
      scenario_type: input.scenarioType,
      description: input.description,
      system_prompt_template: input.systemPromptTemplate,
      developer_prompt_template: input.developerPromptTemplate,
      default_provider_code: input.defaultProviderCode,
      default_model_code: input.defaultModelCode,
      context_message_limit: input.contextMessageLimit,
      max_output_tokens: input.maxOutputTokens,
      temperature: input.temperature,
      top_p: input.topP,
      stream_enabled: input.streamEnabled,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .select("id")
    .single()

  mapWriteError(error, "Agent code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_create",
    targetType: "ai_agent",
    targetId: (data as { id: string }).id,
    afterSnapshot: {
      code: input.code,
      name: input.name,
      scenarioType: input.scenarioType,
      defaultProviderCode: input.defaultProviderCode,
      defaultModelCode: input.defaultModelCode,
      isActive: input.isActive,
    },
    reason: input.changeReason,
  })

  const detail = await getAdminAIAgentDetail(adminAccountId, (data as { id: string }).id)
  if (!detail) {
    throw new Error("created agent not found")
  }
  return detail
}

export async function updateAdminAIAgent(
  adminAccountId: string,
  agentId: string,
  input: AdminAIAgentUpsertRequest,
): Promise<AdminAIAgentDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)
  const existing = await getAdminAIAgentDetail(adminAccountId, agentId)
  if (!existing) {
    return null
  }

  const [provider, model] = await Promise.all([
    loadProviderByCode(input.defaultProviderCode),
    loadModelByCode(input.defaultModelCode),
  ])
  if (!provider || !model) {
    throwNamedError("VALIDATION_FAILED", "默认 Provider 或 Model 不存在。")
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("agent_templates")
    .update({
      code: input.code,
      name: input.name,
      scenario_type: input.scenarioType,
      description: input.description,
      system_prompt_template: input.systemPromptTemplate,
      developer_prompt_template: input.developerPromptTemplate,
      default_provider_code: input.defaultProviderCode,
      default_model_code: input.defaultModelCode,
      context_message_limit: input.contextMessageLimit,
      max_output_tokens: input.maxOutputTokens,
      temperature: input.temperature,
      top_p: input.topP,
      stream_enabled: input.streamEnabled,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .eq("id", agentId)

  mapWriteError(error, "Agent code")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_update",
    targetType: "ai_agent",
    targetId: agentId,
    beforeSnapshot: existing.agent,
    afterSnapshot: {
      ...existing.agent,
      code: input.code,
      name: input.name,
      scenarioType: input.scenarioType,
      description: input.description,
      systemPromptTemplate: input.systemPromptTemplate,
      developerPromptTemplate: input.developerPromptTemplate,
      defaultProviderCode: input.defaultProviderCode,
      defaultModelCode: input.defaultModelCode,
      contextMessageLimit: input.contextMessageLimit,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
      topP: input.topP,
      streamEnabled: input.streamEnabled,
      isActive: input.isActive,
      metadata: input.metadata,
    },
    reason: input.changeReason,
  })

  return getAdminAIAgentDetail(adminAccountId, agentId)
}

export async function getAdminAIAgentBindingList(filters: {
  adminAccountId: string
  keyword?: string
  page: number
  limit: number
}): Promise<AdminAIAgentBindingListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [agents, bindings, tools, paths] = await Promise.all([
    loadAgents(),
    loadAgentBindings(),
    loadTools(),
    loadPaths(),
  ])

  const agentByCode = new Map(agents.map((row) => [row.code, row]))
  const toolById = new Map(tools.map((row) => [row.id, row]))
  const pathById = new Map(paths.map((row) => [row.id, row]))

  const mapped = bindings
    .map((row) => mapAgentBindingItem(row, agentByCode, toolById, pathById))
    .filter((row) =>
      filterByKeyword(filters.keyword, [
        row.agentCode,
        row.agentName,
        row.toolCode,
        row.toolName,
        row.pathCode,
        row.pathName,
        row.interactionType,
      ]),
    )

  const pageData = paginate(mapped, filters.page, filters.limit)
  return {
    ...pageData,
    agentOptions: agents.map((row) => ({ code: row.code, name: row.name })),
    toolOptions: tools.map((row) => ({ id: row.id, code: row.code, name: row.name })),
    pathOptions: paths.map((row) => ({ id: row.id, code: row.code, name: row.name })),
  }
}

export async function createAdminAIAgentBinding(
  adminAccountId: string,
  input: AdminAIAgentBindingUpsertRequest,
): Promise<AdminAIAgentBindingListItem> {
  await assertCanAccessAI(adminAccountId)

  const agent = await loadAgentByCode(input.agentCode)
  if (!agent) {
    throwNamedError("VALIDATION_FAILED", "Agent 不存在。")
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("agent_bindings")
    .insert({
      agent_code: input.agentCode,
      tool_id: input.toolId,
      learning_level: input.learningLevel,
      selection_mode: input.selectionMode,
      path_id: input.pathId,
      step_no: input.stepNo,
      interaction_type: input.interactionType,
      priority: input.priority,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .select("id")
    .single()

  mapWriteError(error, "命中规则")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_binding_create",
    targetType: "ai_agent_binding",
    targetId: (data as { id: string }).id,
    afterSnapshot: input,
    reason: input.changeReason,
  })

  const list = await getAdminAIAgentBindingList({ adminAccountId, page: 1, limit: 1000 })
  const item = list.items.find((row) => row.bindingId === (data as { id: string }).id)
  if (!item) {
    throw new Error("created agent binding not found")
  }
  return item
}

export async function updateAdminAIAgentBinding(
  adminAccountId: string,
  bindingId: string,
  input: AdminAIAgentBindingUpsertRequest,
): Promise<AdminAIAgentBindingListItem | null> {
  await assertCanAccessAI(adminAccountId)

  const list = await getAdminAIAgentBindingList({ adminAccountId, page: 1, limit: 1000 })
  const existing = list.items.find((row) => row.bindingId === bindingId)
  if (!existing) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("agent_bindings")
    .update({
      agent_code: input.agentCode,
      tool_id: input.toolId,
      learning_level: input.learningLevel,
      selection_mode: input.selectionMode,
      path_id: input.pathId,
      step_no: input.stepNo,
      interaction_type: input.interactionType,
      priority: input.priority,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .eq("id", bindingId)

  mapWriteError(error, "命中规则")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_binding_update",
    targetType: "ai_agent_binding",
    targetId: bindingId,
    beforeSnapshot: existing,
    afterSnapshot: input,
    reason: input.changeReason,
  })

  const nextList = await getAdminAIAgentBindingList({ adminAccountId, page: 1, limit: 1000 })
  return nextList.items.find((row) => row.bindingId === bindingId) ?? null
}

export async function getAdminAISkillList(filters: {
  adminAccountId: string
  keyword?: string
  page: number
  limit: number
}): Promise<AdminAISkillListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [skills, skillBindings] = await Promise.all([loadSkills(), loadAgentSkillBindings()])
  const mapped = skills
    .map((row) => mapSkillListItem(row, skillBindings))
    .filter((row) =>
      filterByKeyword(filters.keyword, [
        row.code,
        row.name,
        row.version,
        row.rootPath,
        row.manifestPath,
        row.sourceType,
        row.trustLevel,
      ]),
    )

  return paginate(mapped, filters.page, filters.limit)
}

export async function getAdminAIAgentSkillBindingList(filters: {
  adminAccountId: string
  keyword?: string
  page: number
  limit: number
}): Promise<AdminAIAgentSkillBindingListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [agents, skills, bindings] = await Promise.all([
    loadAgents(),
    loadSkills(),
    loadAgentSkillBindings(),
  ])

  const agentByCode = new Map(agents.map((row) => [row.code, row]))
  const skillByCode = new Map(skills.map((row) => [row.code, row]))

  const mapped = bindings
    .map((row) => mapAgentSkillBindingItem(row, agentByCode, skillByCode))
    .filter((row) => filterByKeyword(filters.keyword, [row.agentCode, row.agentName, row.skillCode, row.skillName]))

  const pageData = paginate(mapped, filters.page, filters.limit)
  return {
    ...pageData,
    agentOptions: agents.map((row) => ({ code: row.code, name: row.name })),
    skillOptions: skills.map((row) => ({ code: row.code, name: row.name })),
  }
}

export async function createAdminAIAgentSkillBinding(
  adminAccountId: string,
  input: AdminAIAgentSkillBindingUpsertRequest,
): Promise<AdminAIAgentSkillBindingListItem> {
  await assertCanAccessAI(adminAccountId)

  const [agent, skill] = await Promise.all([
    loadAgentByCode(input.agentCode),
    loadSkillByCode(input.skillCode),
  ])
  if (!agent || !skill) {
    throwNamedError("VALIDATION_FAILED", "Agent 或 Skill 不存在。")
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("agent_skill_bindings")
    .insert({
      agent_code: input.agentCode,
      skill_code: input.skillCode,
      priority: input.priority,
      is_required: input.isRequired,
      context_budget_tokens: input.contextBudgetTokens,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .select("id")
    .single()

  mapWriteError(error, "Agent + Skill 绑定")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_skill_binding_create",
    targetType: "ai_agent_skill_binding",
    targetId: (data as { id: string }).id,
    afterSnapshot: input,
    reason: input.changeReason,
  })

  const list = await getAdminAIAgentSkillBindingList({ adminAccountId, page: 1, limit: 1000 })
  const item = list.items.find((row) => row.bindingId === (data as { id: string }).id)
  if (!item) {
    throw new Error("created skill binding not found")
  }
  return item
}

export async function updateAdminAIAgentSkillBinding(
  adminAccountId: string,
  bindingId: string,
  input: AdminAIAgentSkillBindingUpsertRequest,
): Promise<AdminAIAgentSkillBindingListItem | null> {
  await assertCanAccessAI(adminAccountId)

  const list = await getAdminAIAgentSkillBindingList({ adminAccountId, page: 1, limit: 1000 })
  const existing = list.items.find((row) => row.bindingId === bindingId)
  if (!existing) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("agent_skill_bindings")
    .update({
      agent_code: input.agentCode,
      skill_code: input.skillCode,
      priority: input.priority,
      is_required: input.isRequired,
      context_budget_tokens: input.contextBudgetTokens,
      is_active: input.isActive,
      metadata: input.metadata,
    })
    .eq("id", bindingId)

  mapWriteError(error, "Agent + Skill 绑定")

  await writeAdminAIAudit({
    adminAccountId,
    action: "ai_agent_skill_binding_update",
    targetType: "ai_agent_skill_binding",
    targetId: bindingId,
    beforeSnapshot: existing,
    afterSnapshot: input,
    reason: input.changeReason,
  })

  const nextList = await getAdminAIAgentSkillBindingList({ adminAccountId, page: 1, limit: 1000 })
  return nextList.items.find((row) => row.bindingId === bindingId) ?? null
}

export async function getAdminAIInvocationList(filters: {
  adminAccountId: string
  keyword?: string
  status: "all" | "streaming" | "succeeded" | "failed" | "cancelled" | "timed_out"
  providerCode?: string
  modelCode?: string
  agentCode?: string
  dateRange: "24h" | "7d" | "30d" | "90d"
  page: number
  limit: number
}): Promise<AdminAIInvocationListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)
  const [invocations, providers, models, agents] = await Promise.all([
    loadInvocations(),
    loadProviders(),
    loadModels(),
    loadAgents(),
  ])

  const dateWindowMs =
    filters.dateRange === "24h" ? 24 * 60 * 60 * 1000
      : filters.dateRange === "7d" ? 7 * 24 * 60 * 60 * 1000
        : filters.dateRange === "30d" ? 30 * 24 * 60 * 60 * 1000
          : 90 * 24 * 60 * 60 * 1000
  const since = Date.now() - dateWindowMs

  const mapped = invocations
    .filter((row) => new Date(row.created_at).getTime() >= since)
    .filter((row) => (filters.status === "all" ? true : row.status === filters.status))
    .filter((row) => (filters.providerCode ? row.provider_code === filters.providerCode : true))
    .filter((row) => (filters.modelCode ? row.model_code === filters.modelCode : true))
    .filter((row) => (filters.agentCode ? row.agent_code === filters.agentCode : true))
    .map((row) => mapInvocationListItem(row))
    .filter((row) =>
      filterByKeyword(filters.keyword, [
        row.invocationId,
        row.sessionId,
        row.userId,
        row.providerCode,
        row.modelCode,
        row.agentCode,
        row.errorCode,
      ]),
    )

  const pageData = paginate(mapped, filters.page, filters.limit)
  return {
    ...pageData,
    providerOptions: providers.map((row) => ({ code: row.code, name: row.name })),
    modelOptions: models.map((row) => ({ code: row.code, name: row.display_name })),
    agentOptions: agents.map((row) => ({ code: row.code, name: row.name })),
  }
}

export async function getAdminAIInvocationDetail(
  adminAccountId: string,
  invocationId: string,
): Promise<AdminAIInvocationDetailResponseData | null> {
  await assertCanAccessAI(adminAccountId)
  if (!isUuid(invocationId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("llm_invocations")
    .select("*")
    .eq("id", invocationId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query invocation detail")
  const row = (data ?? null) as InvocationRow | null
  if (!row) {
    return null
  }

  return {
    invocation: {
      invocationId: row.id,
      sessionId: row.session_id,
      assistantMessageId: row.assistant_message_id,
      userMessageId: row.user_message_id,
      userId: row.user_id,
      providerCode: row.provider_code,
      modelCode: row.model_code,
      agentCode: row.agent_code,
      status: row.status,
      streamEnabled: row.stream_enabled,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      totalTokens: row.total_tokens,
      latencyMs: row.latency_ms,
      firstChunkLatencyMs: row.first_chunk_latency_ms,
      finishReason: row.finish_reason,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      requestPayloadRedacted: row.request_payload_redacted ?? {},
      responsePayloadRedacted: row.response_payload_redacted ?? {},
      createdAt: row.created_at,
    },
  }
}

export async function resolveAdminAIPreview(
  adminAccountId: string,
  input: AdminAIResolvePreviewRequest,
): Promise<AdminAIResolvePreviewResponseData> {
  await assertCanAccessAI(adminAccountId)

  const [bindings, agents, skillBindings, skills] = await Promise.all([
    loadAgentBindings(),
    loadAgents(),
    loadAgentSkillBindings(),
    loadSkills(),
  ])

  const matchedBinding = resolvePreviewBinding(bindings, input)
  if (!matchedBinding) {
    return {
      matchedBinding: null,
      agent: null,
      matchedSkills: [],
    }
  }

  const agent = agents.find((row) => row.code === matchedBinding.agent_code) ?? null
  const skillByCode = new Map(skills.map((row) => [row.code, row]))

  return {
    matchedBinding: {
      bindingId: matchedBinding.id,
      agentCode: matchedBinding.agent_code,
      priority: matchedBinding.priority,
      specificityScore: scoreBindingSpecificity(matchedBinding),
    },
    agent: agent
      ? {
          code: agent.code,
          name: agent.name,
          providerCode: agent.default_provider_code,
          modelCode: agent.default_model_code,
        }
      : null,
    matchedSkills: skillBindings
      .filter((row) => row.agent_code === matchedBinding.agent_code && row.is_active)
      .sort((left, right) => left.priority - right.priority)
      .map((row) => ({
        bindingId: row.id,
        skillCode: row.skill_code,
        skillName: skillByCode.get(row.skill_code)?.name ?? row.skill_code,
        priority: row.priority,
      })),
  }
}

async function createAdminTestSession(input: {
  actorUserId: string
  toolId: string
  agentCode: string
  providerCode: string
  modelCode: string
  now: string
}) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("conversation_sessions")
    .insert({
      user_id: input.actorUserId,
      user_learning_path_id: null,
      user_task_id: null,
      selection_mode: "self_directed",
      tool_id: input.toolId,
      agent_code_snapshot: input.agentCode,
      provider_code_snapshot: input.providerCode,
      model_code_snapshot: input.modelCode,
      status: "completed",
      message_count: 0,
      started_at: input.now,
      closed_at: input.now,
      last_message_at: input.now,
      metadata: {
        source: "admin_ai_test",
      },
    })
    .select("id")
    .single()

  assertSupabaseSuccess(error, "failed to create admin ai test session")
  return data as SessionInsertResult
}

export async function executeAdminAITest(
  adminAccountId: string,
  input: AdminAITestRequest,
): Promise<AdminAITestResponseData> {
  const actor = await assertCanAccessAI(adminAccountId)
  const [agent, provider, model, tools] = await Promise.all([
    loadAgentByCode(input.agentCode),
    loadProviderByCode(input.providerCode),
    loadModelByCode(input.modelCode),
    loadTools(),
  ])

  if (!agent || !provider || !model) {
    throwNamedError("VALIDATION_FAILED", "Agent、Provider 或 Model 不存在。")
  }

  if (!provider.is_active || !model.is_active || !agent.is_active) {
    throwNamedError("VALIDATION_FAILED", "测试对象包含已停用配置，无法执行测试。")
  }

  const tool = tools[0]
  if (!tool) {
    throwNamedError("VALIDATION_FAILED", "当前无可用学习工具，无法创建测试上下文。")
  }

  const now = new Date().toISOString()
  const session = await createAdminTestSession({
    actorUserId: actor.user_id,
    toolId: tool.id,
    agentCode: agent.code,
    providerCode: provider.code,
    modelCode: model.code,
    now,
  })

  const systemPrompt = [
    agent.system_prompt_template,
    agent.developer_prompt_template ?? "",
    "这是管理后台的 AI 测试请求，只返回测试输出，不引用任何真实用户上下文。",
  ]
    .filter(Boolean)
    .join("\n\n")

  const startedAt = Date.now()
  try {
    const providerResult = input.stream
      ? await streamAIProvider({
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
          temperature: Number(agent.temperature),
          maxOutputTokens: agent.max_output_tokens,
          onTextDelta: async () => {},
        })
      : await invokeAIProvider({
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
          temperature: Number(agent.temperature),
          maxOutputTokens: agent.max_output_tokens,
        })

    const latencyMs = Date.now() - startedAt
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("llm_invocations")
      .insert({
        session_id: session.id,
        assistant_message_id: null,
        user_message_id: null,
        user_id: actor.user_id,
        provider_code: provider.code,
        model_code: model.code,
        agent_code: agent.code,
        status: "succeeded",
        stream_enabled: input.stream,
        prompt_tokens: providerResult.usage.promptTokens,
        completion_tokens: providerResult.usage.completionTokens,
        total_tokens: providerResult.usage.totalTokens,
        latency_ms: latencyMs,
        finish_reason: providerResult.finishReason,
        request_payload_redacted: {
          ...providerResult.requestPayloadRedacted,
          source: "admin_ai_test",
          promptLength: input.prompt.length,
        },
        response_payload_redacted: {
          ...providerResult.responsePayloadRedacted,
          source: "admin_ai_test",
        },
      })
      .select("id")
      .single()

    assertSupabaseSuccess(error, "failed to insert admin ai test invocation")

    await writeAdminAIAudit({
      adminAccountId,
      action: "ai_test_run",
      targetType: "ai_test",
      targetId: (data as { id: string }).id,
      afterSnapshot: {
        invocationId: (data as { id: string }).id,
        agentCode: agent.code,
        providerCode: provider.code,
        modelCode: model.code,
        status: "succeeded",
      },
      reason: input.changeReason,
      requestContext: {
        stream: input.stream,
      },
    })

    return {
      invocationId: (data as { id: string }).id,
      providerCode: provider.code,
      modelCode: model.code,
      agentCode: agent.code,
      status: "succeeded",
      content: providerResult.content,
      finishReason: providerResult.finishReason,
      usage: {
        promptTokens: providerResult.usage.promptTokens,
        completionTokens: providerResult.usage.completionTokens,
        totalTokens: providerResult.usage.totalTokens,
      },
      latencyMs,
      requestPayloadRedacted: {
        ...providerResult.requestPayloadRedacted,
        source: "admin_ai_test",
      },
      responsePayloadRedacted: {
        ...providerResult.responsePayloadRedacted,
        source: "admin_ai_test",
      },
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : "Unknown AI provider error"
    const status = /timed out/i.test(message) ? "timed_out" : "failed"
    const supabase = createSupabaseAdminClient()
    const { data: invocationData, error: invocationError } = await supabase
      .from("llm_invocations")
      .insert({
        session_id: session.id,
        assistant_message_id: null,
        user_message_id: null,
        user_id: actor.user_id,
        provider_code: provider.code,
        model_code: model.code,
        agent_code: agent.code,
        status,
        stream_enabled: input.stream,
        latency_ms: latencyMs,
        error_code: "AI_PROVIDER_ERROR",
        error_message: message,
        request_payload_redacted: {
          source: "admin_ai_test",
          promptLength: input.prompt.length,
          stream: input.stream,
        },
        response_payload_redacted: {
          source: "admin_ai_test",
          error: message,
        },
      })
      .select("id")
      .single()

    assertSupabaseSuccess(invocationError, "failed to insert failed admin ai test invocation")

    await writeAdminAIAudit({
      adminAccountId,
      action: "ai_test_run",
      targetType: "ai_test",
      targetId: (invocationData as { id: string }).id,
      afterSnapshot: {
        invocationId: (invocationData as { id: string }).id,
        agentCode: agent.code,
        providerCode: provider.code,
        modelCode: model.code,
        status,
        error: message,
      },
      reason: input.changeReason,
      requestContext: {
        stream: input.stream,
      },
    })

    return {
      invocationId: (invocationData as { id: string }).id,
      providerCode: provider.code,
      modelCode: model.code,
      agentCode: agent.code,
      status,
      content: "",
      finishReason: null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      latencyMs,
      requestPayloadRedacted: {
        source: "admin_ai_test",
        promptLength: input.prompt.length,
        stream: input.stream,
      },
      responsePayloadRedacted: {
        source: "admin_ai_test",
        error: message,
      },
    }
  }
}
