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

  const countBase = supabase.from("learning_paths").select("*", { count: "exact", head: true }).eq("source_type", "self_directed")
  let countQuery: unknown = countBase
  const baseQuery = supabase
    .from("learning_paths")
    .select("id, tool_id, code, name, target_level, source_type, stage_count, description, metadata, agent_code, is_active, created_at, updated_at")
    .eq("source_type", "self_directed")
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

async function assertNoActiveConflict(input: {
  toolId: string
  level: "beginner" | "intermediate" | "advanced"
  excludeTemplateId?: string
}) {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("learning_paths")
    .select("id")
    .eq("tool_id", input.toolId)
    .eq("target_level", input.level)
    .eq("source_type", "self_directed")
    .eq("is_active", true)

  if (input.excludeTemplateId) {
    query = query.neq("id", input.excludeTemplateId)
  }

  const { data, error } = await query.limit(1)
  assertSupabaseSuccess(error, "failed to query template conflict")
  if ((data ?? []).length > 0) {
    throwNamedError("CONFLICT", "同一工具和水平下已存在启用的自学模板。")
  }
}

function buildStepWriteRow(templateId: string, step: AdminLearningTemplateStepInput, stepNo: number, now: string) {
  const normalized = normalizeTemplateStep(step)
  return {
    path_id: templateId,
    step_no: stepNo,
    title: normalized.title,
    summary: normalized.summary,
    focus: normalized.focus,
    goal: normalized.goal,
    completion_criteria: normalized.completionCriteria,
    review_summary: normalized.reviewSummary,
    estimated_minutes: normalized.estimatedMinutes,
    reward_score: normalized.rewardScore,
    knowledge_points: normalized.knowledgePoints,
    key_points: normalized.keyPoints,
    pitfalls: normalized.pitfalls,
    metadata: {
      lessonBrief: normalized.lessonBrief,
      practiceSteps: normalized.practiceSteps,
      submissionGuide: normalized.submissionGuide,
      checkpoints: normalized.checkpoints,
    },
    updated_at: now,
  }
}

async function replaceTemplateSteps(templateId: string, steps: AdminLearningTemplateStepInput[], now: string) {
  const supabase = createSupabaseAdminClient()
  const { data: existingData, error: existingError } = await supabase
    .from("path_steps")
    .select("id, step_no, metadata")
    .eq("path_id", templateId)
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(existingError, "failed to query old template steps")

  const existingRows = ((existingData ?? []) as Array<{ id: string; step_no: number; metadata: Record<string, unknown> | null }>)
  const activeRows = existingRows.filter((row) => !isArchivedStep(row))
  const archivedRows = existingRows.filter(isArchivedStep)
  const submittedIds = new Set(
    steps
      .map((step) => step.stepId)
      .filter((stepId): stepId is string => Boolean(stepId && isUuid(stepId))),
  )
  const removedRows = activeRows.filter((row) => !submittedIds.has(row.id))
  const maxStepNo = existingRows.reduce((max, row) => Math.max(max, row.step_no), steps.length)
  const temporaryOffset = Math.max(maxStepNo, steps.length) + 1000

  for (const [index, row] of [...activeRows, ...archivedRows].entries()) {
    const { error: moveError } = await supabase
      .from("path_steps")
      .update({
        step_no: temporaryOffset + index + 1,
        updated_at: now,
      })
      .eq("id", row.id)
    assertSupabaseSuccess(moveError, "failed to reserve template step numbers")
  }

  if (removedRows.length > 0) {
    const { data: referencedData, error: referencedError } = await supabase
      .from("user_tasks")
      .select("path_step_id")
      .in("path_step_id", removedRows.map((row) => row.id))

    assertSupabaseSuccess(referencedError, "failed to query referenced template steps")

    const referencedIds = new Set(
      ((referencedData ?? []) as Array<{ path_step_id: string }>).map((row) => row.path_step_id),
    )

    for (const [index, row] of removedRows.entries()) {
      if (referencedIds.has(row.id)) {
        const { error: archiveError } = await supabase
          .from("path_steps")
          .update({
            step_no: temporaryOffset + activeRows.length + archivedRows.length + index + 1,
            metadata: {
              ...(row.metadata ?? {}),
              archivedAt: now,
              archiveReason: "admin_template_step_removed",
            },
            updated_at: now,
          })
          .eq("id", row.id)
        assertSupabaseSuccess(archiveError, "failed to archive referenced template step")
      } else {
        const { error: deleteError } = await supabase.from("path_steps").delete().eq("id", row.id)
        assertSupabaseSuccess(deleteError, "failed to delete unused template step")
      }
    }
  }

  const insertRows: Array<Record<string, unknown>> = []
  for (const [index, step] of steps.entries()) {
    const stepNo = index + 1
    if (step.stepId && isUuid(step.stepId) && activeRows.some((row) => row.id === step.stepId)) {
      const { error: updateError } = await supabase
        .from("path_steps")
        .update(buildStepWriteRow(templateId, step, stepNo, now))
        .eq("id", step.stepId)
        .eq("path_id", templateId)
      assertSupabaseSuccess(updateError, "failed to update template step")
    } else {
      insertRows.push({
        ...buildStepWriteRow(templateId, step, stepNo, now),
        created_at: now,
      })
    }
  }

  if (insertRows.length > 0) {
    const { error } = await supabase.from("path_steps").insert(insertRows)
    assertSupabaseSuccess(error, "failed to insert template steps")
  }
}

export async function createAdminLearningTemplate(
  adminAccountId: string,
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
  if (input.isActive) {
    await assertNoActiveConflict({ toolId: tool.id, level: input.learningLevel })
  }

  const now = new Date().toISOString()
  const code = input.code?.trim() || buildTemplateCode(tool.code, input.learningLevel)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_paths")
    .insert({
      tool_id: tool.id,
      code,
      name: input.name.trim(),
      target_level: input.learningLevel,
      source_type: "self_directed",
      version: 1,
      is_default: false,
      is_active: input.isActive,
      agent_code: input.agentCode,
      stage_count: input.steps.length,
      description: input.description,
      metadata: {
        preview: input.preview,
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(error, "failed to create learning template")
  const templateId = (data as { id: string }).id
  await replaceTemplateSteps(templateId, input.steps, now)
  await writeAudit({
    adminAccountId,
    action: "learning_template_create",
    targetType: "learning_path_template",
    targetId: templateId,
    afterSnapshot: { ...input, templateId },
    reason: input.changeReason,
  })

  const detail = await getAdminLearningTemplateDetail(templateId)
  if (!detail) {
    throw new Error("created template missing")
  }
  return detail
}

export async function updateAdminLearningTemplate(
  adminAccountId: string,
  templateId: string,
  input: AdminLearningTemplateUpsertRequest,
): Promise<AdminLearningTemplateDetailResponseData | null> {
  const existing = await getAdminLearningTemplateDetail(templateId)
  const existingRow = await loadTemplateById(templateId)
  if (!existing || !existingRow) {
    return null
  }

  const validation = validateTemplateUpsert(input)
  if (!validation.ok) {
    throwNamedError("VALIDATION_FAILED", validation.errors.join(" "))
  }
  const tool = await loadToolByCode(input.toolCode)
  if (!tool) {
    throwNamedError("VALIDATION_FAILED", "学习工具不存在。")
  }
  if (input.isActive) {
    await assertNoActiveConflict({ toolId: tool.id, level: input.learningLevel, excludeTemplateId: templateId })
  }

  const now = new Date().toISOString()
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("learning_paths")
    .update({
      tool_id: tool.id,
      code: input.code?.trim() || existing.template.code,
      name: input.name.trim(),
      target_level: input.learningLevel,
      description: input.description,
      metadata: {
        ...(existingRow.metadata ?? {}),
        preview: input.preview,
      },
      agent_code: input.agentCode,
      is_active: input.isActive,
      stage_count: input.steps.length,
      updated_at: now,
    })
    .eq("id", templateId)

  assertSupabaseSuccess(error, "failed to update learning template")
  await replaceTemplateSteps(templateId, input.steps, now)
  await writeAudit({
    adminAccountId,
    action: "learning_template_update",
    targetType: "learning_path_template",
    targetId: templateId,
    beforeSnapshot: existing as unknown as Record<string, unknown>,
    afterSnapshot: { ...input, templateId },
    reason: input.changeReason,
  })

  return getAdminLearningTemplateDetail(templateId)
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
  const template = await loadTemplateById(templateId)
  if (!template) {
    return null
  }
  const steps = await loadSteps(templateId)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, selection_mode, status, completed_steps, metadata")
    .eq("template_path_id", templateId)
    .in("status", ["active", "interrupted"])
  assertSupabaseSuccess(error, "failed to query paths for template sync")

  const candidates = ((data ?? []) as UserPathRow[]).filter(isSyncableInitialSelfDirectedPath)
  const now = new Date().toISOString()
  let synced = 0

  for (const path of candidates) {
    const { data: pathData, error: pathError } = await supabase
      .from("user_learning_paths")
      .select("user_id")
      .eq("id", path.id)
      .maybeSingle()
    assertSupabaseSuccess(pathError, "failed to query sync path user")
    const userId = (pathData as { user_id: string } | null)?.user_id
    if (!userId) {
      continue
    }

    const { error: deleteError } = await supabase.from("user_tasks").delete().eq("user_learning_path_id", path.id)
    assertSupabaseSuccess(deleteError, "failed to delete old user tasks during template sync")

    const taskRows = steps.map((step, index) => ({
      user_id: userId,
      user_learning_path_id: path.id,
      path_step_id: step.id,
      status: index === 0 ? "in_progress" : "not_started",
      started_at: index === 0 ? now : null,
      attempt_count: 0,
      score_awarded: 0,
      metadata: {},
      created_at: now,
      updated_at: now,
    }))
    const { data: taskData, error: taskError } = await supabase.from("user_tasks").insert(taskRows).select("id, path_step_id")
    assertSupabaseSuccess(taskError, "failed to insert user tasks during template sync")
    const firstTaskId = (taskData as Array<{ id: string; path_step_id: string }> | null)?.find((task) => task.path_step_id === steps[0]?.id)?.id ?? null
    const { error: updateError } = await supabase
      .from("user_learning_paths")
      .update({
        path_name_snapshot: template.name,
        path_summary_snapshot: template.description,
        total_steps: steps.length,
        current_task_id: firstTaskId,
        metadata: {
          ...(path.metadata ?? {}),
          templateSyncedAt: now,
          templateSyncedBy: adminAccountId,
        },
        updated_at: now,
      })
      .eq("id", path.id)
    assertSupabaseSuccess(updateError, "failed to update user path during template sync")
    synced += 1
  }

  await writeAudit({
    adminAccountId,
    action: "learning_template_sync_unstarted",
    targetType: "learning_path_template",
    targetId: templateId,
    afterSnapshot: {
      matchedPathCount: candidates.length,
      syncedPathCount: synced,
      skippedPathCount: candidates.length - synced,
    },
    reason: "同步未开始的初始化自学路径",
  })

  return {
    templateId,
    matchedPathCount: candidates.length,
    syncedPathCount: synced,
    skippedPathCount: candidates.length - synced,
  }
}
