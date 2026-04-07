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

export const ADMIN_AI_AGENT_SCENARIO_TYPES = [
  "teaching",
  "blocked_help",
  "task_review",
  "completion_feedback",
  "path_guidance",
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

export type AdminAIModelListItem = {
  modelId: string
  providerId: string
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
  modelCode: string
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
  modelCode: string
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
