import "server-only"

import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import type {
  AdminLearningTemplateDetailResponseData,
  AdminLearningTemplateGenerateRequest,
  AdminLearningTemplateGenerateResponseData,
  AdminLearningTemplateListItem,
  AdminLearningTemplateListResponseData,
  AdminLearningTemplateStep,
  AdminLearningTemplateStepInput,
  AdminLearningTemplateSyncResponseData,
  AdminLearningTemplateUpsertRequest,
} from "@/lib/api/contracts/admin-learning-templates"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import { isUuid } from "@/server/lib/identifiers"
import {
  loadAIAgentsSnapshot,
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import { invokeAIProvider } from "@/server/modules/learning/provider.ts"
import type { AIChatMessage } from "@/server/modules/learning/provider.ts"
import {
  isSyncableInitialSelfDirectedPath,
  normalizeTemplateStep,
  parseGeneratedTemplateJson,
  validateTemplateUpsert,
} from "./logic.ts"

const TEMPLATE_PLANNER_AGENT_CODE = "self-study-template-planner"

type ToolRow = {
  id: string
  code: string
  name: string
}

type TemplateRow = {
  id: string
  tool_id: string
  code: string
  name: string
  target_level: "beginner" | "intermediate" | "advanced"
  source_type: string
  stage_count: number
  description: string | null
  metadata: Record<string, unknown> | null
  agent_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type StepRow = {
  id: string
  path_id: string
  step_no: number
  title: string
  summary: string
  focus: string | null
  goal: string
  completion_criteria: string | null
  review_summary: string | null
  estimated_minutes: number | null
  reward_score: number
  knowledge_points: unknown
  key_points: unknown
  pitfalls: unknown
  metadata: Record<string, unknown> | null
}

type UserPathRow = {
  id: string
  selection_mode: string
  status: string
  completed_steps: number
  metadata: Record<string, unknown> | null
}

type AgentTemplateRow = {
  code: string
  system_prompt_template: string
  developer_prompt_template: string | null
  default_provider_code: string
  default_model_code: string
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

function throwNamedError(name: "CONFLICT" | "VALIDATION_FAILED" | "NOT_FOUND", message: string): never {
  const error = new Error(message)
  error.name = name
  throw error
}

function levelLabel(level: "beginner" | "intermediate" | "advanced") {
  switch (level) {
    case "beginner":
      return "零基础"
    case "intermediate":
      return "进阶"
    case "advanced":
      return "高阶"
  }
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

function isArchivedStep(row: { metadata: Record<string, unknown> | null }) {
  return typeof row.metadata?.archivedAt === "string"
}

function mapStep(row: StepRow): AdminLearningTemplateStep {
  return {
    stepId: row.id,
    stepNo: row.step_no,
    title: row.title,
    summary: row.summary,
    focus: row.focus,
    goal: row.goal,
    completionCriteria: row.completion_criteria,
    reviewSummary: row.review_summary,
    estimatedMinutes: row.estimated_minutes,
    rewardScore: row.reward_score,
    knowledgePoints: readStringArray(row.knowledge_points),
    keyPoints: readStringArray(row.key_points),
    pitfalls: readStringArray(row.pitfalls),
    lessonBrief: typeof row.metadata?.lessonBrief === "string" ? row.metadata.lessonBrief : null,
    practiceSteps: readStringArray(row.metadata?.practiceSteps),
    submissionGuide: typeof row.metadata?.submissionGuide === "string" ? row.metadata.submissionGuide : null,
    checkpoints: readStringArray(row.metadata?.checkpoints),
  }
}

function mapListItem(row: TemplateRow, tool: ToolRow | undefined, syncablePathCount: number): AdminLearningTemplateListItem {
  return {
    templateId: row.id,
    toolCode: tool?.code ?? row.tool_id,
    toolName: tool?.name ?? "未知工具",
    learningLevel: row.target_level,
    learningLevelLabel: levelLabel(row.target_level),
    code: row.code,
    name: row.name,
    description: row.description,
    stageCount: row.stage_count,
    isActive: row.is_active,
    syncablePathCount,
    updatedAt: toIsoDate(row.updated_at),
  }
}

async function loadTools() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  assertSupabaseSuccess(error, "failed to query learning tools")
  return (data ?? []) as ToolRow[]
}

async function loadToolByCode(toolCode: string) {
  const tools = await loadTools()
  return tools.find((tool) => tool.code === toolCode) ?? null
}

async function loadTemplateById(templateId: string) {
  if (!isUuid(templateId)) {
    return null
  }
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_paths")
    .select("id, tool_id, code, name, target_level, source_type, stage_count, description, metadata, agent_code, is_active, created_at, updated_at")
    .eq("id", templateId)
    .eq("source_type", "self_directed")
    .eq("metadata->>templateScope", "admin_self_directed_initial")
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query learning template")
  return (data ?? null) as TemplateRow | null
}

async function loadSteps(templateId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("path_steps")
    .select("id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary, estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, metadata")
    .eq("path_id", templateId)
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(error, "failed to query learning template steps")
  return ((data ?? []) as StepRow[]).filter((row) => !isArchivedStep(row))
}

async function countSyncablePathsByTemplate(templateIds: string[]) {
  if (templateIds.length === 0) {
    return new Map<string, number>()
  }
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, template_path_id, selection_mode, status, completed_steps, metadata")
    .in("template_path_id", templateIds)
    .in("status", ["active", "interrupted"])

  assertSupabaseSuccess(error, "failed to query syncable learning paths")
  const counts = new Map<string, number>()
  for (const row of (data ?? []) as Array<UserPathRow & { template_path_id: string }>) {
    if (isSyncableInitialSelfDirectedPath(row)) {
      counts.set(row.template_path_id, (counts.get(row.template_path_id) ?? 0) + 1)
    }
  }
  return counts
}

async function writeAudit(input: {
  adminAccountId: string
  action: AdminAuditAction
  targetType: string
  targetId?: string | null
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
  reason?: string | null
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
    request_context: null,
  })

  assertSupabaseSuccess(error, "failed to write admin learning template audit")
}

export async function getAdminLearningTemplateList(filters: {
  keyword?: string
  status: "all" | "active" | "inactive"
  toolCode?: string
  learningLevel?: "beginner" | "intermediate" | "advanced"
  page: number
  limit: number
}): Promise<AdminLearningTemplateListResponseData> {
  const supabase = createSupabaseAdminClient()
  const tools = await loadTools()
  const toolById = new Map(tools.map((tool) => [tool.id, tool]))
  const toolByCode = new Map(tools.map((tool) => [tool.code, tool]))
  const page = Math.max(1, filters.page)
  const limit = Math.max(1, Math.min(100, filters.limit))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const countBase = supabase
    .from("learning_paths")
    .select("*", { count: "exact", head: true })
    .eq("source_type", "self_directed")
    .eq("metadata->>templateScope", "admin_self_directed_initial")
  let countQuery: unknown = countBase
  const baseQuery = supabase
    .from("learning_paths")
    .select("id, tool_id, code, name, target_level, source_type, stage_count, description, metadata, agent_code, is_active, created_at, updated_at")
    .eq("source_type", "self_directed")
    .eq("metadata->>templateScope", "admin_self_directed_initial")
    .order("updated_at", { ascending: false })
    .range(from, to)
  let query: unknown = baseQuery

  const applyFilters = (candidate: unknown) => {
    let next = candidate as typeof baseQuery
    if (filters.status === "active") {
      next = next.eq("is_active", true)
    } else if (filters.status === "inactive") {
      next = next.eq("is_active", false)
    }
    if (filters.learningLevel) {
      next = next.eq("target_level", filters.learningLevel)
    }
    if (filters.toolCode) {
      const tool = toolByCode.get(filters.toolCode)
      next = tool ? next.eq("tool_id", tool.id) : next.eq("tool_id", "00000000-0000-0000-0000-000000000000")
    }
    if (filters.keyword?.trim()) {
      const keyword = `%${filters.keyword.trim()}%`
      next = next.or(`name.ilike.${keyword},code.ilike.${keyword}`)
    }
    return next
  }

  countQuery = applyFilters(countQuery)
  query = applyFilters(query)

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery as Awaited<typeof countBase>,
    query as Awaited<typeof baseQuery>,
  ])
  assertSupabaseSuccess(countError, "failed to count learning templates")
  assertSupabaseSuccess(error, "failed to query learning templates")

  const rows = (data ?? []) as TemplateRow[]
  const syncCounts = await countSyncablePathsByTemplate(rows.map((row) => row.id))

  return {
    items: rows.map((row) => mapListItem(row, toolById.get(row.tool_id), syncCounts.get(row.id) ?? 0)),
    total: count ?? 0,
    page,
    limit,
    toolOptions: tools.map((tool) => ({ code: tool.code, name: tool.name })),
  }
}

export async function getAdminLearningTemplateDetail(
  templateId: string,
): Promise<AdminLearningTemplateDetailResponseData | null> {
  const [template, tools] = await Promise.all([loadTemplateById(templateId), loadTools()])
  if (!template) {
    return null
  }

  const [steps, syncCounts] = await Promise.all([
    loadSteps(template.id),
    countSyncablePathsByTemplate([template.id]),
  ])
  const tool = tools.find((item) => item.id === template.tool_id)
  const base = mapListItem(template, tool, syncCounts.get(template.id) ?? 0)

  return {
    template: {
      ...base,
      preview: readStringArray(template.metadata?.preview),
      agentCode: template.agent_code,
      createdAt: toIsoDate(template.created_at),
    },
    steps: steps.map(mapStep),
  }
}

function buildTemplateCode(toolCode: string, level: string) {
  return `path-${toolCode}-${level}-self-study`
}

function buildTemplateStepPayload(step: AdminLearningTemplateStepInput) {
  const normalized = normalizeTemplateStep(step)
  return {
    stepId: normalized.stepId && isUuid(normalized.stepId) ? normalized.stepId : null,
    title: normalized.title,
    summary: normalized.summary,
    focus: normalized.focus,
    goal: normalized.goal,
    completionCriteria: normalized.completionCriteria,
    reviewSummary: normalized.reviewSummary,
    estimatedMinutes: normalized.estimatedMinutes,
    rewardScore: normalized.rewardScore,
    knowledgePoints: normalized.knowledgePoints,
    keyPoints: normalized.keyPoints,
    pitfalls: normalized.pitfalls,
    lessonBrief: normalized.lessonBrief,
    practiceSteps: normalized.practiceSteps,
    submissionGuide: normalized.submissionGuide,
    checkpoints: normalized.checkpoints,
  }
}

type TemplateRpcError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function mapTemplateRpcError(error: TemplateRpcError, context: string): never {
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  if (
    error.code === "23505"
    || message.includes("TEMPLATE_UNIQUE_CONFLICT")
    || message.includes("uidx_learning_paths_self_directed_active_tool_level")
    || message.includes("learning_paths_code_key")
    || message.includes("duplicate key")
  ) {
    throwNamedError("CONFLICT", "同一工具和水平下已存在启用模板，或模板 code 已存在。")
  }
  if (message.includes("TEMPLATE_NOT_FOUND")) {
    throwNamedError("NOT_FOUND", "学习路径模板不存在。")
  }
  if (message.includes("TEMPLATE_TOOL_NOT_FOUND")) {
    throwNamedError("VALIDATION_FAILED", "学习工具不存在。")
  }
  if (message.includes("TEMPLATE_STEPS_EMPTY")) {
    throwNamedError("VALIDATION_FAILED", "至少需要 1 个学习步骤。")
  }
  throw new Error(`${context}: ${error.message ?? "unknown Supabase error"}`)
}

function assertTemplateRpcSuccess(error: TemplateRpcError | null, context: string) {
  if (error) {
    mapTemplateRpcError(error, context)
  }
}

function readTemplateIdFromRpc(data: unknown) {
  if (data && typeof data === "object" && "templateId" in data && typeof data.templateId === "string") {
    return data.templateId
  }
  return null
}

async function saveAdminLearningTemplate(
  adminAccountId: string,
  templateId: string | null,
  input: AdminLearningTemplateUpsertRequest,
): Promise<AdminLearningTemplateDetailResponseData> {
  const validation = validateTemplateUpsert(input)
  if (!validation.ok) {
    throwNamedError("VALIDATION_FAILED", validation.errors.join(" "))
  }

  const tool = await loadToolByCode(input.toolCode)
  if (!tool) {
    throwNamedError("VALIDATION_FAILED", "学习工具不存在。")
  }

  const code = templateId ? input.code?.trim() || null : input.code?.trim() || buildTemplateCode(tool.code, input.learningLevel)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .rpc("save_self_directed_learning_template", {
      p_admin_account_id: adminAccountId,
      p_template_id: templateId,
      p_tool_code: tool.code,
      p_learning_level: input.learningLevel,
      p_code: code,
      p_name: input.name.trim(),
      p_description: input.description?.trim() || null,
      p_preview: input.preview,
      p_agent_code: input.agentCode?.trim() || null,
      p_is_active: input.isActive,
      p_steps: input.steps.map(buildTemplateStepPayload),
      p_change_reason: input.changeReason.trim() || "管理后台保存自学模板",
    })

  assertTemplateRpcSuccess(error, "failed to save learning template")
  const savedTemplateId = readTemplateIdFromRpc(data)
  if (!savedTemplateId) {
    throw new Error("saved template missing")
  }

  const detail = await getAdminLearningTemplateDetail(savedTemplateId)
  if (!detail) {
    throw new Error("saved template missing")
  }
  return detail
}

export async function createAdminLearningTemplate(
  adminAccountId: string,
  input: AdminLearningTemplateUpsertRequest,
): Promise<AdminLearningTemplateDetailResponseData> {
  return saveAdminLearningTemplate(adminAccountId, null, input)
}

export async function updateAdminLearningTemplate(
  adminAccountId: string,
  templateId: string,
  input: AdminLearningTemplateUpsertRequest,
): Promise<AdminLearningTemplateDetailResponseData | null> {
  if (!isUuid(templateId)) {
    return null
  }
  return saveAdminLearningTemplate(adminAccountId, templateId, input)
}

async function loadPlannerRuntime() {
  const [agents, providers, models] = await Promise.all([
    loadAIAgentsSnapshot<AgentTemplateRow>(),
    loadAIProvidersSnapshot<ProviderRow>(),
    loadAIModelsSnapshot<ModelRow>(),
  ])
  const agent = agents.find((item) => item.code === TEMPLATE_PLANNER_AGENT_CODE && item.is_active) ?? null
  if (!agent) {
    throwNamedError("VALIDATION_FAILED", "后台学习路径模板生成 Agent 未配置。")
  }
  const provider = providers.find((item) => item.code === agent.default_provider_code && item.is_active) ?? null
  const model = models.find((item) => item.code === agent.default_model_code && item.is_active) ?? null
  if (!provider || !model) {
    throwNamedError("VALIDATION_FAILED", "后台学习路径模板生成 Provider 或 Model 未配置。")
  }
  return { agent, provider, model }
}

function buildGeneratePrompt(input: AdminLearningTemplateGenerateRequest, tool: ToolRow) {
  return JSON.stringify({
    tool: {
      code: tool.code,
      name: tool.name,
    },
    learningLevel: input.learningLevel,
    operatorGoal: input.operatorGoal ?? null,
    currentTemplate: input.currentTemplate ?? null,
  })
}

async function createAdminTemplateGenerationSession(input: {
  adminUserId: string
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
      user_id: input.adminUserId,
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
      metadata: { source: "admin_learning_template_generate" },
      is_admin_test: true,
    })
    .select("id")
    .single()
  assertSupabaseSuccess(error, "failed to create template generation session")
  return (data as { id: string }).id
}

async function loadAdminAccountUserId(adminAccountId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("admin_accounts").select("user_id").eq("id", adminAccountId).maybeSingle()
  assertSupabaseSuccess(error, "failed to query admin account")
  return (data as { user_id: string } | null)?.user_id ?? adminAccountId
}

export async function generateAdminLearningTemplate(
  adminAccountId: string,
  input: AdminLearningTemplateGenerateRequest,
): Promise<AdminLearningTemplateGenerateResponseData> {
  const tool = await loadToolByCode(input.toolCode)
  if (!tool) {
    throwNamedError("VALIDATION_FAILED", "学习工具不存在。")
  }
  const { agent, provider, model } = await loadPlannerRuntime()
  const systemPrompt = [
    agent.system_prompt_template,
    agent.developer_prompt_template ?? "",
  ].filter(Boolean).join("\n\n")
  const messages: AIChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildGeneratePrompt(input, tool) },
  ]

  const startedAt = Date.now()
  const result = await invokeAIProvider({
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
      timeoutMs: Math.max(provider.timeout_ms, 120_000),
      retryCount: provider.timeout_ms < 120_000 ? 0 : provider.retry_count,
    },
    model: {
      code: model.code,
      modelName: model.model_name,
    },
    messages,
    temperature: Number(agent.temperature),
    maxOutputTokens: agent.max_output_tokens,
  })
  const latencyMs = Date.now() - startedAt
  const generated = parseGeneratedTemplateJson(result.content)
  const adminUserId = await loadAdminAccountUserId(adminAccountId)
  const now = new Date().toISOString()
  const sessionId = await createAdminTemplateGenerationSession({
    adminUserId,
    toolId: tool.id,
    agentCode: agent.code,
    providerCode: provider.code,
    modelCode: model.code,
    now,
  })

  const supabase = createSupabaseAdminClient()
  const { data: invocationData, error: invocationError } = await supabase
    .from("llm_invocations")
    .insert({
      session_id: sessionId,
      assistant_message_id: null,
      user_message_id: null,
      user_id: adminUserId,
      provider_code: provider.code,
      model_code: model.code,
      agent_code: agent.code,
      status: "succeeded",
      stream_enabled: false,
      prompt_tokens: result.usage.promptTokens,
      completion_tokens: result.usage.completionTokens,
      total_tokens: result.usage.totalTokens,
      latency_ms: latencyMs,
      finish_reason: result.finishReason,
      request_payload_redacted: {
        source: "admin_learning_template_generate",
        toolCode: tool.code,
        learningLevel: input.learningLevel,
        operatorGoalLength: input.operatorGoal?.length ?? 0,
      },
      response_payload_redacted: {
        source: "admin_learning_template_generate",
        generatedStepCount: generated.steps.length,
      },
    })
    .select("id")
    .single()
  assertSupabaseSuccess(invocationError, "failed to insert template generation invocation")

  const invocationId = (invocationData as { id: string }).id
  await writeAudit({
    adminAccountId,
    action: "learning_template_ai_generate",
    targetType: "learning_path_template",
    targetId: null,
    afterSnapshot: {
      invocationId,
      toolCode: tool.code,
      learningLevel: input.learningLevel,
      generatedStepCount: generated.steps.length,
    },
    reason: input.operatorGoal ?? "AI 生成自学模板草稿",
  })

  return {
    generated,
    agentCode: agent.code,
    providerCode: provider.code,
    modelCode: model.code,
    invocationId,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    },
    latencyMs,
  }
}

export async function syncUnstartedAdminLearningTemplate(
  adminAccountId: string,
  templateId: string,
): Promise<AdminLearningTemplateSyncResponseData | null> {
  if (!isUuid(templateId)) {
    return null
  }
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .rpc("sync_self_directed_learning_template_unstarted", {
      p_admin_account_id: adminAccountId,
      p_template_id: templateId,
    })

  assertTemplateRpcSuccess(error, "failed to sync unstarted learning template")
  if (!data) {
    return null
  }

  return {
    templateId: String((data as { templateId?: unknown }).templateId ?? templateId),
    matchedPathCount: Number((data as { matchedPathCount?: unknown }).matchedPathCount ?? 0),
    syncedPathCount: Number((data as { syncedPathCount?: unknown }).syncedPathCount ?? 0),
    skippedPathCount: Number((data as { skippedPathCount?: unknown }).skippedPathCount ?? 0),
  }
}
