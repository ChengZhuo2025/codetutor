export const ADMIN_AI_PROVIDER_TYPES = [
  "siliconflow",
  "openai_compatible",
  "anthropic",
] as const

export const ADMIN_AI_AUTH_MODES = [
  "bearer",
  "api_key_header",
] as const

export const ADMIN_AI_PROVIDER_SECRET_SOURCES = [
  "database",
  "env_fallback",
  "missing",
] as const

export const ADMIN_AI_MODEL_FAMILIES = [
  "chat",
  "reasoning",
  "asr",
  "vision",
  "other",
] as const

export const ADMIN_AI_MODEL_RUNTIME_CAPABILITIES = [
  "asr",
  "vision",
  "quality_check",
] as const

export const ADMIN_AI_MODEL_CONNECTION_TEST_MODES = [
  "chat",
  "audio_transcription",
  "models_list",
] as const

export const ADMIN_AI_AGENT_SCENARIO_TYPES = [
  "teaching",
  "blocked_help",
  "task_review",
  "completion_feedback",
  "path_guidance",
  "concept_qa",
  "media_vision_extract",
  "media_audio_transcribe",
] as const

export const ADMIN_AI_SKILL_SOURCE_TYPES = [
  "built_in",
  "imported",
  "custom",
] as const

export const ADMIN_AI_SKILL_TRUST_LEVELS = [
  "internal_verified",
  "reviewed_external",
  "untrusted",
] as const

export const ADMIN_AI_INVOCATION_STATUSES = [
  "streaming",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
] as const

export const ADMIN_AI_ACTIVE_STATUS_OPTIONS = [
  "all",
  "active",
  "inactive",
] as const

export const ADMIN_AI_INVOCATION_STATUS_OPTIONS = [
  "all",
  ...ADMIN_AI_INVOCATION_STATUSES,
] as const

export const ADMIN_AI_INVOCATION_DATE_RANGES = [
  "24h",
  "7d",
  "30d",
  "90d",
] as const

export type AdminAIProviderType = (typeof ADMIN_AI_PROVIDER_TYPES)[number]
export type AdminAIAuthMode = (typeof ADMIN_AI_AUTH_MODES)[number]
export type AdminAIProviderSecretSource = (typeof ADMIN_AI_PROVIDER_SECRET_SOURCES)[number]
export type AdminAIModelFamily = (typeof ADMIN_AI_MODEL_FAMILIES)[number]
export type AdminAIModelRuntimeCapability = (typeof ADMIN_AI_MODEL_RUNTIME_CAPABILITIES)[number]
export type AdminAIModelConnectionTestMode = (typeof ADMIN_AI_MODEL_CONNECTION_TEST_MODES)[number]
export type AdminAIAgentScenarioType = (typeof ADMIN_AI_AGENT_SCENARIO_TYPES)[number]
export type AdminAISkillSourceType = (typeof ADMIN_AI_SKILL_SOURCE_TYPES)[number]
export type AdminAISkillTrustLevel = (typeof ADMIN_AI_SKILL_TRUST_LEVELS)[number]
export type AdminAIInvocationStatus = (typeof ADMIN_AI_INVOCATION_STATUSES)[number]
export type AdminAIActiveStatusOption = (typeof ADMIN_AI_ACTIVE_STATUS_OPTIONS)[number]
export type AdminAIInvocationStatusOption = (typeof ADMIN_AI_INVOCATION_STATUS_OPTIONS)[number]
export type AdminAIInvocationDateRange = (typeof ADMIN_AI_INVOCATION_DATE_RANGES)[number]

export type AdminAIPermissions = {
  canView: boolean
  canManage: boolean
}

export type AdminAIOverviewResponseData = {
  permissions: AdminAIPermissions
  stats: {
    totalProviders: number
    activeProviders: number
    totalModels: number
    activeModels: number
    totalAgents: number
    activeAgents: number
    totalSkills: number
    activeSkills: number
    invocationCountLast7Days: number
    failedInvocationCountLast7Days: number
    successRateLast7Days: number
  }
  topAgents: Array<{
    agentCode: string
    agentName: string
    invocationCount: number
    failedInvocationCount: number
  }>
  recentFailures: Array<{
    invocationId: string
    agentCode: string
    providerCode: string
    modelCode: string
    errorMessage: string | null
    createdAt: string
  }>
}

export type AdminAIProviderListItem = {
  providerId: string
  code: string
  name: string
  providerType: AdminAIProviderType
  baseUrl: string
  authMode: AdminAIAuthMode
  secretSource: AdminAIProviderSecretSource
  secretMasked: string
  envSecretRef: string | null
  hasStoredSecret: boolean
  supportsStream: boolean
  supportsJsonMode: boolean
  timeoutMs: number
  retryCount: number
  isActive: boolean
  modelCount: number
  createdAt: string
  updatedAt: string
}

export type AdminAIProviderListResponseData = {
  items: AdminAIProviderListItem[]
  total: number
  page: number
  limit: number
}

export type AdminAIProviderDetail = Omit<AdminAIProviderListItem, "modelCount"> & {
  version: number
  metadata: Record<string, unknown>
}

export type AdminAIProviderDetailResponseData = {
  provider: AdminAIProviderDetail
  linkedModelCodes: string[]
  linkedAgentCodes: string[]
}

export type AdminAIProviderUpsertRequest = {
  code: string
  name: string
  providerType: AdminAIProviderType
  baseUrl: string
  authMode: AdminAIAuthMode
  envSecretRef: string | null
  apiKey: string | null
  keepExistingSecret: boolean
  supportsStream: boolean
  supportsJsonMode: boolean
  timeoutMs: number
  retryCount: number
  isActive: boolean
  metadata: Record<string, unknown>
  version?: number
  changeReason: string
}

export type AdminAIProviderSecretRevealResponseData = {
  apiKey: string
  source: AdminAIProviderSecretSource
}

/** 编辑 Provider 时「连接测试」请求体：与表单一致，用于在未保存前验证 Base URL + 密钥。 */
export type AdminAIProviderTestConnectionRequest = {
  baseUrl: string
  authMode: AdminAIAuthMode
  providerType: AdminAIProviderType
  /** 与表单一致；为 null 时使用数据库中的 env 回退配置解析密钥 */
  envSecretRef: string | null
  /** 非空则仅用该值探测，不落库；为空则按 envSecretRef + 库内密文解析 */
  apiKey: string | null
  timeoutMs: number
}

export type AdminAIProviderTestConnectionResponseData = {
  success: boolean
  message: string
  httpStatus?: number
  /** 相对 Base URL 的探测路径，例如 `/models` */
  testedPath?: string
}

/** 编辑 Model 时「连接测试」：默认发起最小模型探测；`quality_check` / thinking 类模型退化为 `/models` 连通性验证。 */
export type AdminAIModelTestConnectionRequest = {
  providerCode: string
  modelName: string
  /** 探测用 max_tokens，默认 16，范围 1–512 */
  maxOutputTokens?: number
  /** 覆盖超时；未传时使用 Provider 库内 timeout_ms（并做上下限裁剪） */
  timeoutMs?: number
}

export type AdminAIModelTestConnectionResponseData = AdminAIProviderTestConnectionResponseData

export type AdminAIModelListItem = {
  modelId: string
  providerId: string
  providerCode: string
  providerName: string
  code: string
  displayName: string
  modelName: string
  supportsStream: boolean
  supportsJsonMode: boolean
  supportsToolCalling: boolean
  maxContextTokens: number
  defaultMaxOutputTokens: number
  recommendedTemperature: number | null
  modelFamily: AdminAIModelFamily
  runtimeCapabilities: AdminAIModelRuntimeCapability[]
  connectionTestMode: AdminAIModelConnectionTestMode
  reasoningEnabled: boolean
  profileGroup: string | null
  notes: string | null
  isActive: boolean
  linkedAgentCount: number
  createdAt: string
  updatedAt: string
}

export type AdminAIModelListResponseData = {
  items: AdminAIModelListItem[]
  total: number
  page: number
  limit: number
}

export type AdminAIModelDetail = Omit<AdminAIModelListItem, "linkedAgentCount"> & {
  pricingMetadata: Record<string, unknown>
  metadata: Record<string, unknown>
  version: number
}

export type AdminAIModelDetailResponseData = {
  model: AdminAIModelDetail
  linkedAgentCodes: string[]
}

export type AdminAIModelUpsertRequest = {
  providerCode: string
  code: string
  displayName: string
  modelName: string
  supportsStream: boolean
  supportsJsonMode: boolean
  supportsToolCalling: boolean
  maxContextTokens: number
  defaultMaxOutputTokens: number
  recommendedTemperature: number | null
  modelFamily: AdminAIModelFamily
  runtimeCapabilities: AdminAIModelRuntimeCapability[]
  connectionTestMode: AdminAIModelConnectionTestMode
  reasoningEnabled: boolean
  profileGroup: string | null
  notes: string | null
  pricingMetadata: Record<string, unknown>
  isActive: boolean
  metadata: Record<string, unknown>
  version?: number
  changeReason: string
}

export type AdminAIAgentBindingListItem = {
  bindingId: string
  agentCode: string
  agentName: string
  toolId: string | null
  toolCode: string | null
  toolName: string | null
  learningLevel: "beginner" | "intermediate" | "advanced" | null
  selectionMode: "self_directed" | "preset_training" | null
  pathId: string | null
  pathCode: string | null
  pathName: string | null
  stepNo: number | null
  interactionType: string
  priority: number
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type AdminAIAgentBindingListResponseData = {
  items: AdminAIAgentBindingListItem[]
  total: number
  page: number
  limit: number
  agentOptions?: Array<{ code: string; name: string }>
  toolOptions?: Array<{ id: string; code: string; name: string }>
  pathOptions?: Array<{ id: string; code: string; name: string }>
}

export type AdminAIAgentDetail = {
  agentId: string
  code: string
  name: string
  scenarioType: AdminAIAgentScenarioType
  description: string | null
  systemPromptTemplate: string
  developerPromptTemplate: string | null
  defaultProviderCode: string
  defaultModelCode: string
  contextMessageLimit: number
  maxOutputTokens: number
  temperature: number
  topP: number | null
  streamEnabled: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

export type AdminAIAgentListItem = {
  agentId: string
  code: string
  name: string
  scenarioType: AdminAIAgentScenarioType
  providerCode: string
  providerName: string
  modelCode: string
  modelDisplayName: string
  streamEnabled: boolean
  isActive: boolean
  bindingCount: number
  skillCount: number
  updatedAt: string
}

export type AdminAIAgentListResponseData = {
  items: AdminAIAgentListItem[]
  total: number
  page: number
  limit: number
}

export type AdminAIAgentDetailResponseData = {
  agent: AdminAIAgentDetail
  bindings: AdminAIAgentBindingListItem[]
  skillBindings: AdminAIAgentSkillBindingListItem[]
}

export type AdminAIAgentUpsertRequest = {
  code: string
  name: string
  scenarioType: AdminAIAgentScenarioType
  description: string | null
  systemPromptTemplate: string
  developerPromptTemplate: string | null
  defaultProviderCode: string
  defaultModelCode: string
  contextMessageLimit: number
  maxOutputTokens: number
  temperature: number
  topP: number | null
  streamEnabled: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  version?: number
  changeReason: string
}

export type AdminAIAgentBindingUpsertRequest = {
  agentCode: string
  toolId: string | null
  learningLevel: "beginner" | "intermediate" | "advanced" | null
  selectionMode: "self_directed" | "preset_training" | null
  pathId: string | null
  stepNo: number | null
  interactionType: string
  priority: number
  isActive: boolean
  metadata: Record<string, unknown>
  changeReason: string
}

export type AdminAISkillListItem = {
  skillId: string
  code: string
  name: string
  version: string
  sourceType: AdminAISkillSourceType
  trustLevel: AdminAISkillTrustLevel
  rootPath: string
  manifestPath: string
  entryResourcePath: string | null
  scriptsEnabled: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  linkedAgentCount: number
  createdAt: string
  updatedAt: string
}

export type AdminAISkillListResponseData = {
  items: AdminAISkillListItem[]
  total: number
  page: number
  limit: number
}

export type AdminAIAgentSkillBindingListItem = {
  bindingId: string
  agentCode: string
  agentName: string
  skillCode: string
  skillName: string
  priority: number
  isRequired: boolean
  contextBudgetTokens: number | null
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type AdminAIAgentSkillBindingListResponseData = {
  items: AdminAIAgentSkillBindingListItem[]
  total: number
  page: number
  limit: number
  agentOptions?: Array<{ code: string; name: string }>
  skillOptions?: Array<{ code: string; name: string }>
}

export type AdminAIAgentSkillBindingUpsertRequest = {
  agentCode: string
  skillCode: string
  priority: number
  isRequired: boolean
  contextBudgetTokens: number | null
  isActive: boolean
  metadata: Record<string, unknown>
  changeReason: string
}

export type AdminAIInvocationListItem = {
  invocationId: string
  sessionId: string
  userId: string
  providerCode: string
  providerName: string
  modelCode: string
  modelDisplayName: string
  agentCode: string
  status: AdminAIInvocationStatus
  streamEnabled: boolean
  totalTokens: number | null
  latencyMs: number | null
  finishReason: string | null
  errorCode: string | null
  createdAt: string
}

export type AdminAIInvocationListResponseData = {
  items: AdminAIInvocationListItem[]
  total: number
  page: number
  limit: number
  providerOptions?: Array<{ code: string; name: string }>
  modelOptions?: Array<{ code: string; name: string }>
  agentOptions?: Array<{ code: string; name: string }>
}

export type AdminAIInvocationDetailResponseData = {
  invocation: {
    invocationId: string
    sessionId: string
    assistantMessageId: string | null
    userMessageId: string | null
    userId: string
    providerCode: string
    modelCode: string
    agentCode: string
    status: AdminAIInvocationStatus
    streamEnabled: boolean
    promptTokens: number | null
    completionTokens: number | null
    totalTokens: number | null
    latencyMs: number | null
    firstChunkLatencyMs: number | null
    finishReason: string | null
    errorCode: string | null
    errorMessage: string | null
    requestPayloadRedacted: Record<string, unknown>
    responsePayloadRedacted: Record<string, unknown>
    createdAt: string
  }
}

export type AdminAIResolvePreviewRequest = {
  interactionType: string
  toolId: string | null
  learningLevel: "beginner" | "intermediate" | "advanced" | null
  selectionMode: "self_directed" | "preset_training" | null
  pathId: string | null
  stepNo: number | null
}

export type AdminAIResolvePreviewResponseData = {
  matchedBinding: {
    bindingId: string
    agentCode: string
    priority: number
    specificityScore: number
  } | null
  agent: {
    code: string
    name: string
    providerCode: string
    modelCode: string
  } | null
  matchedSkills: Array<{
    bindingId: string
    skillCode: string
    skillName: string
    priority: number
  }>
}

export type AdminAITestRequest = {
  agentCode: string
  providerCode: string
  modelCode: string
  prompt: string
  stream: boolean
  changeReason: string
}

export type AdminAITestResponseData = {
  invocationId: string
  providerCode: string
  modelCode: string
  agentCode: string
  status: Extract<AdminAIInvocationStatus, "succeeded" | "failed" | "timed_out">
  content: string
  finishReason: string | null
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latencyMs: number | null
  requestPayloadRedacted: Record<string, unknown>
  responsePayloadRedacted: Record<string, unknown>
}
