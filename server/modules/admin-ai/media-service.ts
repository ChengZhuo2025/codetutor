import type {
  AdminAIMediaAttachmentListItem,
  AdminAIMediaAttachmentListResponseData,
  AdminAIMediaModelOption,
  AdminAIMediaTranscriptionSettingItem,
  AdminAIMediaTranscriptionSettingsResponseData,
  AdminAIMediaTranscriptionSettingUpdateRequest,
  AdminAIMediaTranscriptionSettingUpdateResponseData,
  AdminAIMediaTranscriptionType,
  AdminAIModelRuntimeCapability,
} from "@/lib/api/contracts/admin-ai"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import { modelSupportsRuntimeCapability, resolveStoredModelProfile } from "@/server/modules/ai/model-profile.ts"
import type { MaterialPipelineRuntime } from "@/server/modules/learning-materials/providers.ts"

export type MediaProviderRow = {
  id: string
  code: string
  name?: string
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

export type MediaModelRow = {
  id: string
  provider_id: string
  code: string
  display_name?: string
  model_name: string
  default_max_output_tokens: number
  recommended_temperature: number | null
  is_active: boolean
  model_family?: string | null
  runtime_capabilities?: string[] | null
  connection_test_mode?: string | null
  reasoning_enabled?: boolean
  profile_group?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
}

export type MediaTranscriptionSettingRow = {
  id: string
  media_type: AdminAIMediaTranscriptionType
  model_id: string | null
  is_enabled: boolean
  metadata?: Record<string, unknown> | null
  version: number
  created_at: string
  updated_at: string
}

export type MediaAttachmentRow = {
  id: string
  user_id: string
  session_id: string | null
  message_id: string | null
  kind: "image" | "audio"
  processing_status: "pending" | "processing" | "completed" | "failed"
  storage_bucket: string
  storage_path: string
  original_filename: string | null
  mime_type: string
  size_bytes: number
  duration_ms: number | null
  width: number | null
  height: number | null
  extracted_text: string | null
  visual_summary: string | null
  transcript_text: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type LearningMediaTranscriptionModels = {
  vision: MaterialPipelineRuntime | null
  asr: MaterialPipelineRuntime | null
  textToSpeech: MaterialPipelineRuntime | null
}

const MEDIA_TYPE_META: Record<AdminAIMediaTranscriptionType, {
  label: string
  description: string
  requiredCapability: AdminAIModelRuntimeCapability | null
}> = {
  image_translation: {
    label: "图片转译",
    description: "识别学习截图、报错图、代码图中的可见信息。",
    requiredCapability: "vision",
  },
  speech_to_text: {
    label: "语音转文本",
    description: "将用户学习对话语音转写为稳定文本。",
    requiredCapability: "asr",
  },
  text_to_speech: {
    label: "文本转语音",
    description: "预留给后续 AI 教练语音播报能力。",
    requiredCapability: "tts",
  },
}

function throwNamedError(name: "FORBIDDEN" | "CONFLICT" | "VERSION_CONFLICT" | "VALIDATION_FAILED" | "NOT_FOUND", message: string): never {
  const error = new Error(message)
  error.name = name
  throw error
}

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
  }
}

function runtimeCapabilitiesForModel(model: MediaModelRow): AdminAIModelRuntimeCapability[] {
  return resolveStoredModelProfile({
    modelFamily: model.model_family ?? null,
    runtimeCapabilities: model.runtime_capabilities ?? null,
    connectionTestMode: model.connection_test_mode ?? null,
    reasoningEnabled: model.reasoning_enabled ?? false,
    profileGroup: model.profile_group ?? null,
    notes: model.notes ?? null,
    metadata: model.metadata ?? {},
  }).runtimeCapabilities
}

export function validateMediaTranscriptionModelForType(
  mediaType: AdminAIMediaTranscriptionType,
  model: MediaModelRow | null,
) {
  const capability = MEDIA_TYPE_META[mediaType].requiredCapability
  if (!capability || !model) {
    return null
  }
  if (model.is_active && modelSupportsRuntimeCapability(model, capability)) {
    return null
  }

  if (mediaType === "image_translation") {
    return "图片转译需要选择具备 vision 运行时用途的启用模型。"
  }
  if (mediaType === "speech_to_text") {
    return "语音转文本需要选择具备 asr 运行时用途的启用模型。"
  }
  return "文本转语音需要选择具备 tts 运行时用途的启用模型。"
}

function toRuntime(
  providers: MediaProviderRow[],
  model: MediaModelRow | null,
) {
  if (!model || !model.is_active) {
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
      metadata: model.metadata ?? null,
    },
  } satisfies MaterialPipelineRuntime
}

function runtimeForSetting(input: {
  mediaType: AdminAIMediaTranscriptionType
  providers: MediaProviderRow[]
  models: MediaModelRow[]
  settings: Pick<MediaTranscriptionSettingRow, "media_type" | "model_id" | "is_enabled">[]
}) {
  const setting = input.settings.find((item) => item.media_type === input.mediaType) ?? null
  if (!setting?.is_enabled || !setting.model_id) {
    return null
  }

  const model = input.models.find((item) => item.id === setting.model_id) ?? null
  if (validateMediaTranscriptionModelForType(input.mediaType, model)) {
    return null
  }

  return toRuntime(input.providers, model)
}

export function resolveLearningMediaTranscriptionModelsFromSnapshots(input: {
  providers: MediaProviderRow[]
  models: MediaModelRow[]
  settings: Pick<MediaTranscriptionSettingRow, "id" | "media_type" | "model_id" | "is_enabled">[]
}): LearningMediaTranscriptionModels {
  return {
    vision: runtimeForSetting({
      mediaType: "image_translation",
      providers: input.providers,
      models: input.models,
      settings: input.settings,
    }),
    asr: runtimeForSetting({
      mediaType: "speech_to_text",
      providers: input.providers,
      models: input.models,
      settings: input.settings,
    }),
    textToSpeech: runtimeForSetting({
      mediaType: "text_to_speech",
      providers: input.providers,
      models: input.models,
      settings: input.settings,
    }),
  }
}

export function mapAdminAIMediaTranscriptionSettingRow(
  row: MediaTranscriptionSettingRow,
  modelById: Map<string, MediaModelRow>,
  providerById: Map<string, MediaProviderRow>,
): AdminAIMediaTranscriptionSettingItem {
  const model = row.model_id ? modelById.get(row.model_id) ?? null : null
  const provider = model ? providerById.get(model.provider_id) ?? null : null
  const meta = MEDIA_TYPE_META[row.media_type]

  return {
    settingId: row.id,
    mediaType: row.media_type,
    label: meta.label,
    description: meta.description,
    requiredCapability: meta.requiredCapability,
    modelId: model?.id ?? row.model_id,
    modelCode: model?.code ?? null,
    modelDisplayName: model?.display_name ?? model?.code ?? null,
    providerCode: provider?.code ?? null,
    providerName: provider?.name ?? provider?.code ?? null,
    isEnabled: row.is_enabled,
    version: row.version,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAdminAIMediaAttachmentRow(
  row: MediaAttachmentRow,
  previewUrl: string | null = null,
): AdminAIMediaAttachmentListItem {
  return {
    attachmentId: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    messageId: row.message_id,
    kind: row.kind,
    processingStatus: row.processing_status,
    previewUrl,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationMs: row.duration_ms,
    width: row.width,
    height: row.height,
    extractedText: row.extracted_text,
    visualSummary: row.visual_summary,
    transcriptText: row.transcript_text,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toModelOption(
  model: MediaModelRow,
  providerById: Map<string, MediaProviderRow>,
): AdminAIMediaModelOption {
  const provider = providerById.get(model.provider_id)
  return {
    modelId: model.id,
    code: model.code,
    displayName: model.display_name ?? model.code,
    modelName: model.model_name,
    providerCode: provider?.code ?? "",
    providerName: provider?.name ?? provider?.code ?? "",
    runtimeCapabilities: runtimeCapabilitiesForModel(model),
    isActive: model.is_active,
  }
}

async function assertCanAccessAI(adminAccountId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_accounts")
    .select(`
      id,
      status,
      admin_account_roles (
        admin_roles (
          code
        )
      )
    `)
    .eq("id", adminAccountId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load admin account")
  const roles = ((data as { admin_account_roles?: Array<{ admin_roles?: { code?: string } | null }> } | null)
    ?.admin_account_roles ?? [])
    .map((item) => item.admin_roles?.code)
    .filter(Boolean)
  if (!data || (data as { status?: string }).status !== "active" || !roles.some((role) => role === "super_admin" || role === "ai_ops_admin")) {
    throwNamedError("FORBIDDEN", "仅超级管理员或 Ai 管理管理员可访问 Ai 管理模块。")
  }
}

async function loadSettings() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("media_transcription_settings")
    .select("*")
    .order("media_type", { ascending: true })

  assertSupabaseSuccess(error, "failed to query media transcription settings")
  return (data ?? []) as MediaTranscriptionSettingRow[]
}

export async function resolveLearningMediaTranscriptionModels() {
  const [providers, models, settings] = await Promise.all([
    loadAIProvidersSnapshot<MediaProviderRow>(),
    loadAIModelsSnapshot<MediaModelRow>(),
    loadSettings(),
  ])

  return resolveLearningMediaTranscriptionModelsFromSnapshots({
    providers,
    models,
    settings,
  })
}

export async function getAdminAIMediaTranscriptionSettings(
  adminAccountId: string,
): Promise<AdminAIMediaTranscriptionSettingsResponseData> {
  await assertCanAccessAI(adminAccountId)

  const [providers, models, settings] = await Promise.all([
    loadAIProvidersSnapshot<MediaProviderRow>(),
    loadAIModelsSnapshot<MediaModelRow>(),
    loadSettings(),
  ])
  const providerById = new Map(providers.map((row) => [row.id, row]))
  const modelById = new Map(models.map((row) => [row.id, row]))

  return {
    items: settings.map((row) => mapAdminAIMediaTranscriptionSettingRow(row, modelById, providerById)),
    modelOptions: models
      .filter((model) => model.is_active && providerById.get(model.provider_id)?.is_active)
      .map((model) => toModelOption(model, providerById)),
  }
}

export async function updateAdminAIMediaTranscriptionSetting(
  adminAccountId: string,
  settingId: string,
  input: AdminAIMediaTranscriptionSettingUpdateRequest,
): Promise<AdminAIMediaTranscriptionSettingUpdateResponseData | null> {
  await assertCanAccessAI(adminAccountId)

  const [providers, models, settings] = await Promise.all([
    loadAIProvidersSnapshot<MediaProviderRow>(),
    loadAIModelsSnapshot<MediaModelRow>(),
    loadSettings(),
  ])
  const existing = settings.find((row) => row.id === settingId || row.media_type === settingId) ?? null
  if (!existing) {
    return null
  }

  if (input.version !== undefined && input.version !== existing.version) {
    throwNamedError("VERSION_CONFLICT", `转译设置已被其他人修改（你的版本: ${input.version}，当前版本: ${existing.version}）。请刷新页面后重新编辑。`)
  }

  const selectedModel = input.modelId ? models.find((row) => row.id === input.modelId) ?? null : null
  if (input.isEnabled && !selectedModel) {
    throwNamedError("VALIDATION_FAILED", "开启转译设置时必须选择模型。")
  }
  const validationMessage = validateMediaTranscriptionModelForType(existing.media_type, selectedModel)
  if (input.isEnabled && validationMessage) {
    throwNamedError("VALIDATION_FAILED", validationMessage)
  }

  const supabase = createSupabaseAdminClient()
  const { data: updatedRow, error } = await supabase
    .from("media_transcription_settings")
    .update({
      model_id: input.modelId,
      is_enabled: input.isEnabled,
    })
    .eq("id", existing.id)
    .eq("version", existing.version)
    .select("*")
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to update media transcription setting")
  if (!updatedRow) {
    throwNamedError("VERSION_CONFLICT", `转译设置已被其他人修改（你的版本: ${input.version ?? existing.version}，当前版本: ${existing.version}）。请刷新页面后重新编辑。`)
  }

  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminAccountId,
    action: "ai_media_transcription_setting_update",
    target_type: "ai_media_transcription_setting",
    target_id: existing.id,
    before_snapshot: existing,
    after_snapshot: {
      modelId: input.modelId,
      isEnabled: input.isEnabled,
    },
    reason: input.changeReason,
  })
  assertSupabaseSuccess(auditError, "failed to write media transcription setting audit")

  const providerById = new Map(providers.map((row) => [row.id, row]))
  const modelById = new Map(models.map((row) => [row.id, row]))

  return {
    setting: mapAdminAIMediaTranscriptionSettingRow(updatedRow as MediaTranscriptionSettingRow, modelById, providerById),
  }
}

export async function getAdminAIMediaAttachments(filters: {
  adminAccountId: string
  kind: "all" | "image" | "audio"
  dateRange: "24h" | "7d" | "30d" | "90d"
  page: number
  limit: number
}): Promise<AdminAIMediaAttachmentListResponseData> {
  await assertCanAccessAI(filters.adminAccountId)

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("learning_message_attachments")
    .select("id, user_id, session_id, message_id, kind, processing_status, storage_bucket, storage_path, original_filename, mime_type, size_bytes, duration_ms, width, height, extracted_text, visual_summary, transcript_text, error_message, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (filters.kind !== "all") {
    query = query.eq("kind", filters.kind)
  }
  const rangeMs =
    filters.dateRange === "24h" ? 24 * 60 * 60 * 1000
      : filters.dateRange === "7d" ? 7 * 24 * 60 * 60 * 1000
        : filters.dateRange === "30d" ? 30 * 24 * 60 * 60 * 1000
          : 90 * 24 * 60 * 60 * 1000
  query = query.gte("created_at", new Date(Date.now() - rangeMs).toISOString())

  const { data, error } = await query
  assertSupabaseSuccess(error, "failed to query learning message attachments")

  const rows = (data ?? []) as MediaAttachmentRow[]
  const previewUrls = await Promise.all(rows.map(async (row) => {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 10 * 60)
    if (signedUrlError) {
      return null
    }
    return signedUrlData?.signedUrl ?? null
  }))

  return paginate(rows.map((row, index) => mapAdminAIMediaAttachmentRow(row, previewUrls[index] ?? null)), filters.page, filters.limit)
}
