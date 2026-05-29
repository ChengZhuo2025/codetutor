import "server-only"

import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import type {
  AdminSiteChangelogEntry,
  AdminSiteChangelogGenerateRequest,
  AdminSiteChangelogListQuery,
  AdminSiteChangelogListResponseData,
  AdminSiteChangelogUpdateRequest,
  PublicSiteChangelogEntry,
  PublicSiteChangelogListQuery,
  PublicSiteChangelogListResponseData,
  SiteChangelogCommit,
  SiteChangelogStatus,
} from "@/lib/api/contracts/admin-site"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isUuid } from "@/server/lib/identifiers"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  loadAIAgentsSnapshot,
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import { type AIChatMessage, invokeAIProvider } from "@/server/modules/learning/provider.ts"
import { getCommitRange, loadGitCommitsForDate } from "./git-source.ts"

const CHANGELOG_AGENT_CODE = "site-changelog-writer"
const GENERATION_IN_PROGRESS = "GENERATION_IN_PROGRESS"

type SiteChangelogRow = {
  id: string
  log_date: string
  title: string
  summary_markdown: string
  status: string
  commit_from_sha: string | null
  commit_to_sha: string | null
  commit_count: number
  source_commits_json: unknown
  generated_by_agent_code: string | null
  provider_code_snapshot: string | null
  model_code_snapshot: string | null
  llm_invocation_id: string | null
  generation_error: string | null
  published_at: string | null
  archived_at: string | null
  updated_by_admin_id: string | null
  created_at: string
  updated_at: string | null
}

type AgentTemplateRow = {
  code: string
  is_active: boolean
  system_prompt_template: string
  developer_prompt_template: string | null
  default_provider_code: string
  default_model_code: string
  max_output_tokens: number
  temperature: number | string
}

type ProviderRow = {
  code: string
  is_active: boolean
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
  is_active: boolean
  model_name: string
}

type GeneratedChangelog = {
  title: string
  summaryMarkdown: string
  publishRecommendation?: "publish" | "review" | "skip"
  riskNotes?: string[]
}

function createNamedError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}

function toBusinessError(code: string) {
  switch (code) {
    case "CHANGELOG_ALREADY_PUBLISHED":
      return "指定日期已有已发布更新日志。"
    case "CHANGELOG_DRAFT_EXISTS":
      return "指定日期已有草稿，如需覆盖请开启重新生成。"
    case "INVALID_STATUS_TRANSITION":
      return "当前更新日志状态不支持该操作。"
    case "AI_MODEL_UNAVAILABLE":
      return "更新日志生成 Agent、Provider 或 Model 未启用。"
    case "AI_GENERATION_FAILED":
      return "AI 生成更新日志失败，请稍后重试或检查模型配置。"
    default:
      return code
  }
}

function throwBusinessError(code: string): never {
  throw createNamedError(code, toBusinessError(code))
}

export function mapSiteChangelogSupabaseError(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
) {
  if (
    error?.code === "23505"
    && `${error.message ?? ""} ${error.details ?? ""}`.includes("uidx_site_changelog_entries_log_date_active")
  ) {
    return createNamedError("CHANGELOG_DRAFT_EXISTS", toBusinessError("CHANGELOG_DRAFT_EXISTS"))
  }

  return new Error(`${context}: ${error?.message ?? "unknown Supabase error"}`)
}

function assertSiteChangelogSupabaseSuccess(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
) {
  if (error) {
    throw mapSiteChangelogSupabaseError(error, context)
  }
}

function quotePostgrestFilterValue(value: string) {
  return `"${value.replace(/"/g, "\\\"")}"`
}

function escapeLikePattern(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
}

export function buildChangelogKeywordFilter(keyword: string) {
  const pattern = `%${escapeLikePattern(keyword.trim())}%`
  const quotedPattern = quotePostgrestFilterValue(pattern)
  return `title.ilike.${quotedPattern},summary_markdown.ilike.${quotedPattern}`
}

function normalizeCommits(value: unknown): SiteChangelogCommit[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      sha: typeof item.sha === "string" ? item.sha : "",
      shortSha: typeof item.shortSha === "string" ? item.shortSha : "",
      subject: typeof item.subject === "string" ? item.subject : "",
      body: typeof item.body === "string" ? item.body : null,
      authorName: typeof item.authorName === "string" ? item.authorName : "",
      authorEmail: typeof item.authorEmail === "string" ? item.authorEmail : null,
      committedAt: typeof item.committedAt === "string" ? item.committedAt : "",
    }))
    .filter((item) => item.sha && item.subject)
}

export function mapAdminSiteChangelogRow(row: SiteChangelogRow): AdminSiteChangelogEntry {
  return {
    id: row.id,
    logDate: row.log_date,
    title: row.title,
    summaryMarkdown: row.summary_markdown,
    status: row.status as SiteChangelogStatus,
    commitFromSha: row.commit_from_sha,
    commitToSha: row.commit_to_sha,
    commitCount: row.commit_count,
    sourceCommits: normalizeCommits(row.source_commits_json),
    generatedByAgentCode: row.generated_by_agent_code,
    providerCodeSnapshot: row.provider_code_snapshot,
    modelCodeSnapshot: row.model_code_snapshot,
    llmInvocationId: row.llm_invocation_id,
    generationError: row.generation_error,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

export function toPublicSiteChangelogEntry(
  entry: AdminSiteChangelogEntry,
): PublicSiteChangelogEntry {
  return {
    id: entry.id,
    logDate: entry.logDate,
    title: entry.title,
    summaryMarkdown: entry.summaryMarkdown,
    publishedAt: entry.publishedAt,
  }
}

export function assertCanGenerateDraft(
  existing: { status: string } | null,
  regenerate: boolean,
) {
  if (!existing) return
  if (existing.status === "published") {
    throwBusinessError("CHANGELOG_ALREADY_PUBLISHED")
  }
  if (existing.status === "draft" && !regenerate) {
    throwBusinessError("CHANGELOG_DRAFT_EXISTS")
  }
}

export function assertCanPublishEntry(entry: { status: string }) {
  if (entry.status !== "draft") {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
}

export function assertCanArchiveEntry(entry: { status: string }) {
  if (entry.status === "archived") {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
}

async function writeAudit(input: {
  adminAccountId: string
  action: Extract<
    AdminAuditAction,
    | "site_changelog_generate"
    | "site_changelog_update"
    | "site_changelog_publish"
    | "site_changelog_archive"
    | "site_changelog_delete"
  >
  targetId: string | null
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
  reason?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: "site_changelog",
    target_id: input.targetId,
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    reason: input.reason ?? null,
    request_context: null,
  })
  if (error) {
    console.error("Failed to write site changelog audit log:", error)
  }
}

function baseChangelogSelect() {
  return "*"
}

async function claimGenerationDraft(input: {
  adminAccountId: string
  logDate: string
  existing: SiteChangelogRow | null
  range: ReturnType<typeof getCommitRange>
  commits: SiteChangelogCommit[]
  agentCode: string
  providerCode: string
  modelCode: string
}) {
  const payload = {
    log_date: input.logDate,
    title: `${input.logDate} 更新日志生成中`,
    summary_markdown: "更新日志草稿正在生成中，请稍后刷新。",
    status: "draft",
    commit_from_sha: input.range.commitFromSha,
    commit_to_sha: input.range.commitToSha,
    commit_count: input.range.commitCount,
    source_commits_json: input.commits,
    generated_by_agent_code: input.agentCode,
    provider_code_snapshot: input.providerCode,
    model_code_snapshot: input.modelCode,
    llm_invocation_id: null,
    generation_error: GENERATION_IN_PROGRESS,
    archived_at: null,
    updated_by_admin_id: input.adminAccountId,
  }

  const supabase = createSupabaseAdminClient()
  const request = input.existing?.status === "draft"
    ? supabase
      .from("site_changelog_entries")
      .update(payload)
      .eq("id", input.existing.id)
      .eq("status", "draft")
      .or(`generation_error.is.null,generation_error.neq.${GENERATION_IN_PROGRESS}`)
      .select(baseChangelogSelect())
      .maybeSingle()
    : supabase
      .from("site_changelog_entries")
      .insert(payload)
      .select(baseChangelogSelect())
      .single()

  const { data, error } = await request
  assertSiteChangelogSupabaseSuccess(error, "failed to claim site changelog generation")
  if (!data) {
    throwBusinessError("CHANGELOG_DRAFT_EXISTS")
  }
  return data as unknown as SiteChangelogRow
}

async function markGenerationFailed(entryId: string, message: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("site_changelog_entries")
    .update({
      title: "更新日志生成失败",
      summary_markdown: "AI 更新日志草稿生成失败，请检查模型配置或稍后重新生成。",
      generation_error: message.slice(0, 1000),
    })
    .eq("id", entryId)
    .eq("status", "draft")

  if (error) {
    console.error("Failed to persist site changelog generation error:", error)
  }
}

export async function loadAdminSiteChangelogEntries(
  query: AdminSiteChangelogListQuery,
): Promise<AdminSiteChangelogListResponseData> {
  const supabase = createSupabaseAdminClient()
  const from = (query.page - 1) * query.limit
  const to = from + query.limit - 1
  let request = supabase
    .from("site_changelog_entries")
    .select(baseChangelogSelect(), { count: "exact" })
    .order("log_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to)

  if (query.status !== "all") request = request.eq("status", query.status)
  if (query.startDate) request = request.gte("log_date", query.startDate)
  if (query.endDate) request = request.lte("log_date", query.endDate)
  if (query.keyword) {
    request = request.or(buildChangelogKeywordFilter(query.keyword))
  }

  const { data, error, count } = await request
  assertSupabaseSuccess(error, "failed to load site changelog entries")
  const total = count ?? data?.length ?? 0

  return {
    items: ((data ?? []) as unknown as SiteChangelogRow[]).map(mapAdminSiteChangelogRow),
    total,
    page: query.page,
    pageSize: query.limit,
    hasMore: query.page * query.limit < total,
  }
}

export async function loadAdminSiteChangelogEntry(
  entryId: string,
): Promise<AdminSiteChangelogEntry | null> {
  if (!isUuid(entryId)) return null
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .select(baseChangelogSelect())
    .eq("id", entryId)
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to load site changelog entry")
  return data ? mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow) : null
}

async function loadExistingActiveEntry(logDate: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .select(baseChangelogSelect())
    .eq("log_date", logDate)
    .in("status", ["draft", "published"])
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to load active site changelog")
  return data ? (data as unknown as SiteChangelogRow) : null
}

async function loadChangelogRuntime() {
  const [agents, providers, models] = await Promise.all([
    loadAIAgentsSnapshot<AgentTemplateRow>(),
    loadAIProvidersSnapshot<ProviderRow>(),
    loadAIModelsSnapshot<ModelRow>(),
  ])
  const agent = agents.find((item) => item.code === CHANGELOG_AGENT_CODE && item.is_active) ?? null
  const provider = providers.find((item) => item.code === agent?.default_provider_code && item.is_active) ?? null
  const model = models.find((item) => item.code === agent?.default_model_code && item.is_active) ?? null
  if (!agent || !provider || !model) {
    throwBusinessError("AI_MODEL_UNAVAILABLE")
  }
  return { agent, provider, model }
}

function buildGeneratePrompt(logDate: string, commits: SiteChangelogCommit[]) {
  return JSON.stringify({
    logDate,
    commits: commits.map((commit) => ({
      subject: commit.subject,
      body: commit.body,
      authorName: commit.authorName,
      committedAt: commit.committedAt,
    })),
  })
}

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function parseGeneratedChangelogJson(content: string): GeneratedChangelog {
  try {
    const parsed = JSON.parse(stripJsonFence(content)) as Partial<GeneratedChangelog>
    if (
      typeof parsed.title !== "string"
      || parsed.title.trim().length < 2
      || typeof parsed.summaryMarkdown !== "string"
      || parsed.summaryMarkdown.trim().length < 2
    ) {
      throw new Error("invalid changelog payload")
    }
    return {
      title: parsed.title.trim().slice(0, 160),
      summaryMarkdown: parsed.summaryMarkdown.trim(),
      publishRecommendation: parsed.publishRecommendation,
      riskNotes: Array.isArray(parsed.riskNotes)
        ? parsed.riskNotes.filter((item): item is string => typeof item === "string")
        : [],
    }
  } catch {
    throwBusinessError("AI_GENERATION_FAILED")
  }
}

async function loadAdminAccountUserId(adminAccountId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_accounts")
    .select("user_id")
    .eq("id", adminAccountId)
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to query admin account")
  return (data as unknown as { user_id: string } | null)?.user_id ?? adminAccountId
}

async function loadFallbackToolId() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_tools")
    .select("id")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to query fallback learning tool")
  const toolId = (data as unknown as { id: string } | null)?.id
  if (!toolId) {
    throwBusinessError("AI_MODEL_UNAVAILABLE")
  }
  return toolId
}

async function createGenerationSession(input: {
  adminAccountId: string
  agentCode: string
  providerCode: string
  modelCode: string
}) {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const [adminUserId, toolId] = await Promise.all([
    loadAdminAccountUserId(input.adminAccountId),
    loadFallbackToolId(),
  ])
  const { data, error } = await supabase
    .from("conversation_sessions")
    .insert({
      user_id: adminUserId,
      user_learning_path_id: null,
      user_task_id: null,
      selection_mode: "self_directed",
      tool_id: toolId,
      agent_code_snapshot: input.agentCode,
      provider_code_snapshot: input.providerCode,
      model_code_snapshot: input.modelCode,
      status: "completed",
      message_count: 0,
      started_at: now,
      closed_at: now,
      last_message_at: now,
      metadata: { source: "site_changelog_generate" },
      is_admin_test: true,
    })
    .select("id")
    .single()
  assertSupabaseSuccess(error, "failed to create changelog generation session")
  return {
    sessionId: (data as unknown as { id: string }).id,
    adminUserId,
  }
}

async function insertInvocation(input: {
  adminAccountId: string
  agentCode: string
  providerCode: string
  modelCode: string
  logDate: string
  commitCount: number
  latencyMs: number
  result: Awaited<ReturnType<typeof invokeAIProvider>>
  generated: GeneratedChangelog
}) {
  const { sessionId, adminUserId } = await createGenerationSession({
    adminAccountId: input.adminAccountId,
    agentCode: input.agentCode,
    providerCode: input.providerCode,
    modelCode: input.modelCode,
  })
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("llm_invocations")
    .insert({
      session_id: sessionId,
      assistant_message_id: null,
      user_message_id: null,
      user_id: adminUserId,
      provider_code: input.providerCode,
      model_code: input.modelCode,
      agent_code: input.agentCode,
      status: "succeeded",
      stream_enabled: false,
      prompt_tokens: input.result.usage.promptTokens,
      completion_tokens: input.result.usage.completionTokens,
      total_tokens: input.result.usage.totalTokens,
      latency_ms: input.latencyMs,
      finish_reason: input.result.finishReason,
      request_payload_redacted: {
        source: "site_changelog_generate",
        logDate: input.logDate,
        commitCount: input.commitCount,
      },
      response_payload_redacted: {
        source: "site_changelog_generate",
        title: input.generated.title,
        publishRecommendation: input.generated.publishRecommendation ?? null,
        riskNotes: input.generated.riskNotes ?? [],
      },
    })
    .select("id")
    .single()
  assertSupabaseSuccess(error, "failed to insert changelog invocation")
  return (data as unknown as { id: string }).id
}

export async function generateSiteChangelogDraft(
  adminAccountId: string,
  input: AdminSiteChangelogGenerateRequest,
): Promise<AdminSiteChangelogEntry> {
  const existing = await loadExistingActiveEntry(input.logDate)
  assertCanGenerateDraft(existing, Boolean(input.regenerate))

  const commits = await loadGitCommitsForDate(input.logDate)
  const range = getCommitRange(commits)
  const { agent, provider, model } = await loadChangelogRuntime()
  const claimed = await claimGenerationDraft({
    adminAccountId,
    logDate: input.logDate,
    existing,
    range,
    commits,
    agentCode: agent.code,
    providerCode: provider.code,
    modelCode: model.code,
  })
  const systemPrompt = [
    agent.system_prompt_template,
    agent.developer_prompt_template ?? "",
  ].filter(Boolean).join("\n\n")
  const messages: AIChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildGeneratePrompt(input.logDate, commits) },
  ]

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof invokeAIProvider>>
  let generated: GeneratedChangelog
  let invocationId: string
  try {
    result = await invokeAIProvider({
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
    generated = parseGeneratedChangelogJson(result.content)
    invocationId = await insertInvocation({
      adminAccountId,
      agentCode: agent.code,
      providerCode: provider.code,
      modelCode: model.code,
      logDate: input.logDate,
      commitCount: commits.length,
      latencyMs: Date.now() - startedAt,
      result,
      generated,
    })
  } catch (error) {
    await markGenerationFailed(claimed.id, error instanceof Error ? error.message : String(error))
    throw error
  }

  const payload = {
    log_date: input.logDate,
    title: generated.title,
    summary_markdown: generated.summaryMarkdown,
    status: "draft",
    commit_from_sha: range.commitFromSha,
    commit_to_sha: range.commitToSha,
    commit_count: range.commitCount,
    source_commits_json: commits,
    generated_by_agent_code: agent.code,
    provider_code_snapshot: provider.code,
    model_code_snapshot: model.code,
    llm_invocation_id: invocationId,
    generation_error: null,
    archived_at: null,
    updated_by_admin_id: adminAccountId,
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .update(payload)
    .eq("id", claimed.id)
    .eq("status", "draft")
    .eq("generation_error", GENERATION_IN_PROGRESS)
    .select(baseChangelogSelect())
    .maybeSingle()
  assertSiteChangelogSupabaseSuccess(error, "failed to save generated site changelog")
  if (!data) {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
  const saved = mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)
  await writeAudit({
    adminAccountId,
    action: "site_changelog_generate",
    targetId: saved.id,
    beforeSnapshot: existing ? mapAdminSiteChangelogRow(existing) as unknown as Record<string, unknown> : null,
    afterSnapshot: saved as unknown as Record<string, unknown>,
    reason: `AI 生成 ${input.logDate} 更新日志草稿`,
  })
  return saved
}

export async function updateSiteChangelogEntry(
  adminAccountId: string,
  entryId: string,
  input: AdminSiteChangelogUpdateRequest,
): Promise<AdminSiteChangelogEntry | null> {
  const before = await loadAdminSiteChangelogEntry(entryId)
  if (!before) return null
  if (before.status === "archived") {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }

  const payload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }
  if (input.title !== undefined) payload.title = input.title
  if (input.summaryMarkdown !== undefined) payload.summary_markdown = input.summaryMarkdown

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .update(payload)
    .eq("id", entryId)
    .in("status", ["draft", "published"])
    .select(baseChangelogSelect())
    .maybeSingle()
  assertSiteChangelogSupabaseSuccess(error, "failed to update site changelog")
  if (!data) {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
  const after = mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)
  await writeAudit({
    adminAccountId,
    action: "site_changelog_update",
    targetId: entryId,
    beforeSnapshot: before as unknown as Record<string, unknown>,
    afterSnapshot: after as unknown as Record<string, unknown>,
  })
  return after
}

export async function deleteSiteChangelogEntry(
  adminAccountId: string,
  entryId: string,
): Promise<AdminSiteChangelogEntry | null> {
  const before = await loadAdminSiteChangelogEntry(entryId)
  if (!before) return null

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .delete()
    .eq("id", entryId)
    .select(baseChangelogSelect())
    .maybeSingle()
  assertSiteChangelogSupabaseSuccess(error, "failed to delete site changelog")
  if (!data) {
    return null
  }
  const deleted = mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)
  await writeAudit({
    adminAccountId,
    action: "site_changelog_delete",
    targetId: entryId,
    beforeSnapshot: before as unknown as Record<string, unknown>,
    afterSnapshot: null,
    reason: "删除更新日志",
  })
  return deleted
}

export async function publishSiteChangelogEntry(
  adminAccountId: string,
  entryId: string,
): Promise<AdminSiteChangelogEntry | null> {
  const before = await loadAdminSiteChangelogEntry(entryId)
  if (!before) return null
  assertCanPublishEntry(before)

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      archived_at: null,
      updated_by_admin_id: adminAccountId,
    })
    .eq("id", entryId)
    .eq("status", "draft")
    .select(baseChangelogSelect())
    .maybeSingle()
  assertSiteChangelogSupabaseSuccess(error, "failed to publish site changelog")
  if (!data) {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
  const after = mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)
  await writeAudit({
    adminAccountId,
    action: "site_changelog_publish",
    targetId: entryId,
    beforeSnapshot: before as unknown as Record<string, unknown>,
    afterSnapshot: after as unknown as Record<string, unknown>,
  })
  return after
}

export async function archiveSiteChangelogEntry(
  adminAccountId: string,
  entryId: string,
): Promise<AdminSiteChangelogEntry | null> {
  const before = await loadAdminSiteChangelogEntry(entryId)
  if (!before) return null
  assertCanArchiveEntry(before)

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by_admin_id: adminAccountId,
    })
    .eq("id", entryId)
    .neq("status", "archived")
    .select(baseChangelogSelect())
    .maybeSingle()
  assertSiteChangelogSupabaseSuccess(error, "failed to archive site changelog")
  if (!data) {
    throwBusinessError("INVALID_STATUS_TRANSITION")
  }
  const after = mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)
  await writeAudit({
    adminAccountId,
    action: "site_changelog_archive",
    targetId: entryId,
    beforeSnapshot: before as unknown as Record<string, unknown>,
    afterSnapshot: after as unknown as Record<string, unknown>,
  })
  return after
}

export async function loadPublicSiteChangelogEntries(
  query: PublicSiteChangelogListQuery,
): Promise<PublicSiteChangelogListResponseData> {
  const supabase = createSupabaseAdminClient()
  const from = (query.page - 1) * query.limit
  const to = from + query.limit - 1
  const { data, error, count } = await supabase
    .from("site_changelog_entries")
    .select(baseChangelogSelect(), { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("log_date", { ascending: false })
    .range(from, to)
  assertSupabaseSuccess(error, "failed to load public site changelog entries")
  const total = count ?? data?.length ?? 0
  return {
    items: ((data ?? []) as unknown as SiteChangelogRow[])
      .map(mapAdminSiteChangelogRow)
      .map(toPublicSiteChangelogEntry),
    total,
    page: query.page,
    pageSize: query.limit,
    hasMore: query.page * query.limit < total,
  }
}

export async function loadPublicSiteChangelogEntry(
  entryId: string,
): Promise<PublicSiteChangelogEntry | null> {
  if (!isUuid(entryId)) return null
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_changelog_entries")
    .select(baseChangelogSelect())
    .eq("id", entryId)
    .eq("status", "published")
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to load public site changelog entry")
  return data ? toPublicSiteChangelogEntry(mapAdminSiteChangelogRow(data as unknown as SiteChangelogRow)) : null
}
