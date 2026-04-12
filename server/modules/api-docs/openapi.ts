import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi"
import { z } from "zod"
import { ROUTE_ERROR_MESSAGES } from "@/server/lib/route-error-presets"
import {
  achievementSummaryResponseDataSchema,
  adminAIAgentBindingListResponseDataSchema,
  adminAIAgentBindingListItemSchema,
  adminAIAgentBindingUpsertRequestSchema,
  adminAIAgentDetailResponseDataSchema,
  adminAIAgentIdParamsSchema,
  adminAIAgentListQuerySchema,
  adminAIAgentListResponseDataSchema,
  adminAIAgentSkillBindingListItemSchema,
  adminAIAgentSkillBindingListResponseDataSchema,
  adminAIAgentSkillBindingUpsertRequestSchema,
  adminAIAgentUpsertRequestSchema,
  adminAIBindingIdParamsSchema,
  adminAIInvocationDetailResponseDataSchema,
  adminAIInvocationIdParamsSchema,
  adminAIInvocationListQuerySchema,
  adminAIInvocationListResponseDataSchema,
  adminAIListQuerySchema,
  adminAIModelDetailResponseDataSchema,
  adminAIModelIdParamsSchema,
  adminAIModelListResponseDataSchema,
  adminAIModelTestConnectionRequestSchema,
  adminAIModelTestConnectionResponseDataSchema,
  adminAIModelUpsertRequestSchema,
  adminAIOverviewResponseDataSchema,
  adminAIProviderDetailResponseDataSchema,
  adminAIProviderIdParamsSchema,
  adminAIProviderListResponseDataSchema,
  adminAIProviderSecretRevealResponseDataSchema,
  adminAIProviderTestConnectionRequestSchema,
  adminAIProviderTestConnectionResponseDataSchema,
  adminAIProviderUpsertRequestSchema,
  adminAIQuerySchema,
  adminAIResolvePreviewRequestSchema,
  adminAIResolvePreviewResponseDataSchema,
  adminAISkillListResponseDataSchema,
  adminAITestRequestSchema,
  adminAITestResponseDataSchema,
  adminDashboardOverviewResponseDataSchema,
  adminChangePasswordRequestSchema,
  adminLoginRequestSchema,
  adminSessionResponseDataSchema,
  adminSettingsAdminAccountIdParamsSchema,
  adminSettingsAdminAccountListQuerySchema,
  adminSettingsAdminAccountListResponseDataSchema,
  adminSettingsAuditLogListQuerySchema,
  adminSettingsAuditLogListResponseDataSchema,
  adminSettingsOverviewResponseDataSchema,
  adminFeedbackListQuerySchema,
  adminFeedbackListResponseDataSchema,
  adminFeedbackBatchDeleteRequestSchema,
  adminFeedbackBatchDeleteResponseDataSchema,
  adminFeedbackTicketDetailResponseDataSchema,
  adminFeedbackUserSnapshotResponseDataSchema,
  adminReplyFeedbackRequestSchema,
  adminFeedbackDeleteOkDataSchema,
  adminUpdateFeedbackStatusRequestSchema,
  adminLearningPathDetailResponseDataSchema,
  adminLearningPathIdParamsSchema,
  adminLearningPathListQuerySchema,
  adminLearningPathListResponseDataSchema,
  adminUpdateLearningPathStatusRequestSchema,
  adminUpdateLearningPathStatusResponseDataSchema,
  adminUpdateAdminAccountStatusRequestSchema,
  adminUpdateAdminAccountStatusResponseDataSchema,
  analyticsTrackEventRequestSchema,
  analyticsTrackEventResponseDataSchema,
  adminUserExportViewDataSchema,
  adminUserListQuerySchema,
  adminUserListResponseDataSchema,
  adminUserIdParamsSchema,
  adminUpdateUserRequestSchema,
  adminSoftDeleteUserRequestSchema,
  ApiErrorResponseSchema,
  authLoginRequestSchema,
  authLoginResponseDataSchema,
  authSessionSummaryResponseDataSchema,
  checkinDailyResponseDataSchema,
  completeOnboardingRequestSchema,
  completeOnboardingResponseDataSchema,
  completeTaskRequestSchema,
  completeTaskResponseDataSchema,
  createApiSuccessResponseSchema,
  createFeedbackRequestSchema,
  createFeedbackResponseDataSchema,
  feedbackMineListResponseDataSchema,
  feedbackTicketDetailSchema,
  getOnboardingPathOptionsQuerySchema,
  getOnboardingPathOptionsResponseDataSchema,
  getOnboardingToolsResponseDataSchema,
  historyRecentQuerySchema,
  learningCurrentSessionResponseDataSchema,
  learningRestartConversationResponseDataSchema,
  materialIntakeStatusResponseDataSchema,
  learningPlanDraftDetailResponseDataSchema,
  learningPlanDraftConfirmResponseDataSchema,
  learningPlanDraftPatchRequestSchema,
  learningPlanDraftRegenerateRequestSchema,
  learningPlanFromMaterialRequestSchema,
  learningPlanFromMaterialResponseDataSchema,
  learningMessageRequestSchema,
  learningMessageResponseDataSchema,
  learningMessagesQuerySchema,
  learningMessagesResponseDataSchema,
  learningHistoryDetailResponseDataSchema,
  learningHistoryResponseDataSchema,
  notificationInAppListResponseDataSchema,
  notificationMutationResponseDataSchema,
  notificationSettingsDataSchema,
  openApiStreamResponseSchema,
  profileMeResponseDataSchema,
  progressCurrentResponseDataSchema,
  progressMapResponseDataSchema,
  routeIdParamsSchema,
  updateLearningHistoryStatusRequestSchema,
  updateLearningHistoryStatusResponseDataSchema,
  updateProfileMeRequestSchema,
  updateTaskStatusRequestSchema,
  updateTaskStatusResponseDataSchema,
  uploadProfileAvatarRequestSchema,
  uploadProfileAvatarResponseDataSchema,
} from "./schemas.ts"

const registry = new OpenAPIRegistry()

const EXAMPLE_NOW = "2026-03-31T09:00:00.000Z"
const EXAMPLE_LATER = "2026-03-31T09:05:00.000Z"
const EXAMPLE_LATEST = "2026-03-31T09:10:00.000Z"

const profileMeExample = {
  userId: "user-123",
  nickname: "Bao",
  avatarUrl: "https://cdn.example.com/avatar/user-123.png",
  phone: "13800000000",
  email: "bao@example.com",
  wechat: "bao_cursor",
  bio: "正在用真实项目学习 Cursor。",
  primaryTool: {
    code: "cursor",
    name: "Cursor",
  },
  learningLevel: "beginner",
  currentScore: 120,
  currentRank: "新手学徒",
  streakDays: 3,
  completedTaskCount: 5,
  lastLearningAt: EXAMPLE_NOW,
}

const messageExample = {
  id: 12,
  role: "ai",
  kind: "coach",
  title: "AI 教练引导",
  content: "先确认你已经打开了项目目录，再执行下一步命令。",
  structuredContent: null,
}

const feedbackReplyExample = {
  id: "reply-1",
  authorType: "admin",
  authorId: "system-admin",
  content: "已经收到你的反馈，我们会继续跟进。",
  createdAt: EXAMPLE_LATER,
}

const historyItemExample = {
  id: "path-runtime-1",
  planId: "path-cursor-beginner-01",
  title: "Cursor 入门训练营",
  summary: "从安装、索引到第一次智能改代码。",
  tool: "Cursor",
  level: "入门",
  mode: "预设训练",
  progress: {
    completed: 2,
    total: 5,
    percent: 40,
  },
  xpEarned: 120,
  createdAt: EXAMPLE_NOW,
  updatedAt: EXAMPLE_LATEST,
  status: "in_progress",
}

const adminFeedbackDetailExample = {
  id: "ticket-1",
  feedbackType: "feature_request",
  feedbackTypeLabel: "功能建议",
  status: "replied",
  statusLabel: "已解决",
  title: "希望支持项目级模板",
  content: "如果能直接从项目生成学习路径会更方便。",
  contactMethod: "bao@example.com",
  submittedAt: EXAMPLE_NOW,
  updatedAt: EXAMPLE_LATEST,
  lastReplyAt: EXAMPLE_LATER,
  replies: [feedbackReplyExample],
  userId: "user-123",
  userNicknameSnapshot: "Bao",
  userPhoneSnapshot: "13800000000",
  userContactEmailSnapshot: "bao@example.com",
  priority: "medium",
  source: "settings_popover",
  userSnapshot: {
    avatarUrl: "https://cdn.example.com/avatar/user-123.png",
    nickname: "Bao",
    email: "bao@example.com",
    currentScore: 1240,
    currentRank: "AI 建造者",
    streakDays: 6,
    activePlanName: "Cursor 入门训练营",
    primaryToolName: "Cursor",
    learningLevelLabel: "零基础",
    completedTaskCount: 12,
    lastLearningAt: EXAMPLE_LATER,
    totalTicketCount: 3,
    createdAt: EXAMPLE_NOW,
  },
}

const adminFeedbackUserSnapshotExample = {
  ticketId: "ticket-1",
  userId: "user-123",
  userSnapshot: adminFeedbackDetailExample.userSnapshot,
}

const adminFeedbackBatchDeleteExample = {
  deletedCount: 2,
  deletedIds: ["ticket-1", "ticket-2"],
}

const adminUserExportRowExample = {
  userId: "550e8400-e29b-41d4-a716-446655440001",
  nickname: "Bao",
  avatarUrl: null,
  wechat: "wx_bao",
  contactEmail: "bao@example.com",
  bio: null,
  signupProvider: "phone",
  lastLoginProvider: "phone",
  lastLoginAt: EXAMPLE_NOW,
  authPhone: "13800000000",
  authEmail: null,
  onboardingCompleted: true,
  contentLanguage: "zh-CN",
  primaryToolCode: "cursor",
  primaryToolName: "Cursor",
  activePathStatus: "active",
  activePathSelectionMode: "preset_training",
  activePathLearningLevel: "beginner",
  activePathCode: "cursor-beginner-01",
  activePathName: "Cursor 入门训练营",
  activePathStartedAt: EXAMPLE_NOW,
  activePathLastActivityAt: EXAMPLE_LATEST,
  activePathTotalSteps: 5,
  activePathCompletedSteps: 2,
  activePathCompletionPercent: 40,
  activePathCompletedTaskCount: 2,
  activePathInProgressTaskCount: 1,
  activePathPendingTaskCount: 2,
  activePathBlockedTaskCount: 0,
  completedTaskCountTotal: 10,
  inProgressTaskCountTotal: 1,
  pendingTaskCountTotal: 3,
  blockedTaskCountTotal: 0,
  currentScore: 120,
  currentRankCode: "rookie",
  streakDays: 3,
  lastLearningAt: EXAMPLE_LATER,
  profileCreatedAt: EXAMPLE_NOW,
  profileUpdatedAt: EXAMPLE_LATEST,
  deletedAt: null,
  deletedReason: null,
}

const adminLearningPathListExample = {
  items: [
    {
      pathId: "550e8400-e29b-41d4-a716-446655440100",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      userNickname: "Bao",
      userAvatarUrl: null,
      userEmail: "bao@example.com",
      toolCode: "cursor",
      toolName: "Cursor",
      pathCode: "cursor-beginner-01",
      pathName: "Cursor 入门训练营",
      learningLevel: "beginner",
      learningLevelLabel: "零基础",
      selectionMode: "preset_training",
      selectionModeLabel: "闯关模式",
      status: "interrupted",
      progressPercent: 40,
      completedTaskCount: 2,
      inProgressTaskCount: 1,
      blockedTaskCount: 1,
      totalTaskCount: 5,
      xpEarned: 120,
      startedAt: EXAMPLE_NOW,
      lastLearningAt: EXAMPLE_LATEST,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  stats: {
    totalPaths: 12,
    activeCount: 3,
    interruptedCount: 2,
    completedCount: 5,
    abandonedCount: 2,
  },
  toolOptions: [
    {
      code: "cursor",
      name: "Cursor",
    },
  ],
}

const adminLearningPathDetailExample = {
  pathId: "550e8400-e29b-41d4-a716-446655440100",
  user: {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    nickname: "Bao",
    avatarUrl: null,
    email: "bao@example.com",
    currentScore: 120,
    currentRankLabel: "新手学徒",
    streakDays: 3,
    lastLearningAt: EXAMPLE_LATEST,
  },
  path: {
    pathCode: "cursor-beginner-01",
    pathName: "Cursor 入门训练营",
    summary: "从零开始完成 Cursor 入门学习与第一次真实改代码。",
    toolCode: "cursor",
    toolName: "Cursor",
    learningLevel: "beginner",
    learningLevelLabel: "零基础",
    selectionMode: "preset_training",
    selectionModeLabel: "闯关模式",
    status: "interrupted",
    totalSteps: 5,
    completedSteps: 2,
    progressPercent: 40,
    totalTaskCount: 5,
    completedTaskCount: 2,
    inProgressTaskCount: 1,
    blockedTaskCount: 1,
    pendingTaskCount: 1,
    xpEarned: 120,
  },
  timeline: {
    startedAt: EXAMPLE_NOW,
    lastActivityAt: EXAMPLE_LATEST,
    completedAt: null,
    interruptedAt: "2026-03-31T11:00:00.000Z",
    abandonedAt: null,
    archivedAt: null,
  },
  steps: [
    {
      stepId: "550e8400-e29b-41d4-a716-446655440200",
      stepNo: 1,
      title: "安装 Cursor 并完成项目索引",
      status: "completed",
      rewardXp: 60,
      completedAt: EXAMPLE_LATER,
    },
  ],
  recentSessions: [
    {
      sessionId: "550e8400-e29b-41d4-a716-446655440300",
      status: "active",
      startedAt: EXAMPLE_LATER,
      lastMessageAt: EXAMPLE_LATEST,
      messageCount: 6,
      latestAssistantSummary: "先确认项目索引完成，再继续下一步修复。",
    },
  ],
  materialPlan: {
    draftId: "550e8400-e29b-41d4-a716-446655440700",
    intakeId: "550e8400-e29b-41d4-a716-446655440701",
    title: "Cursor 自学草稿",
    draftStatus: "confirmed",
    revisionNo: 2,
    qualityStatus: "passed",
    qualityReport: {
      status: "passed",
      checks: [
        {
          code: "TASK_COUNT_RANGE",
          passed: true,
          message: "任务数需在 3 到 8 之间。",
        },
      ],
      warnings: ["公开标题与简介已提供足够上下文。"],
      selfCheck: {
        enabled: false,
        decision: "skipped",
        reason: "规则检查已覆盖当前低风险计划，跳过模型自检。",
      },
      fallbackReason: null,
    },
    updatedAt: EXAMPLE_LATEST,
    sources: [
      {
        sourceId: "550e8400-e29b-41d4-a716-446655440702",
        url: "https://www.bilibili.com/video/BV1xx",
        sourceType: "video",
        title: "Cursor 入门教程",
        contentExcerpt: "先用公开标题与简介补齐上下文，再按需升级到 ASR。",
        warnings: ["未拿到稳定字幕，先使用公开标题与简介，必要时继续升级到 ASR。"],
        extractionTrace: [
          {
            stage: "raw_text",
            attempted: true,
            used: true,
            reason: "使用公开页可见正文。",
            producedChars: 220,
          },
          {
            stage: "asr",
            attempted: true,
            used: true,
            reason: "正文不足，升级到 ASR。",
            producedChars: 1800,
          },
        ],
        evidenceCoverage: {
          highConfidenceChars: 220,
          totalUsefulChars: 2020,
          chunkCount: 3,
          isSufficient: true,
          isWeakEvidence: false,
        },
        resolvedModelCodes: {
          asr: "sense-voice-small",
          vision: "qwen-3.5-9b",
          quality: "zai-org-glm-4.6",
        },
      },
    ],
  },
}

const adminSettingsOverviewExample = {
  currentAdmin: {
    adminAccountId: "550e8400-e29b-41d4-a716-446655440011",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    displayName: "超级管理员",
    avatarUrl: "https://cdn.example.com/avatar/admin-1.png",
    email: "admin@example.com",
    status: "active",
    roles: ["super_admin"],
    lastLoginAt: EXAMPLE_LATEST,
  },
  stats: {
    totalAdminAccounts: 4,
    activeAdminAccounts: 3,
    inactiveAdminAccounts: 1,
    suspendedAdminAccounts: 0,
    auditLogCountLast7Days: 12,
  },
  roleDefinitions: [
    {
      code: "super_admin",
      name: "超级管理员",
      description: "拥有全部后台权限。",
      accountCount: 1,
    },
    {
      code: "ops_admin",
      name: "运营管理员",
      description: "负责用户与学习运营。",
      accountCount: 1,
    },
  ],
  systemInfo: {
    appName: "AI编程学习教练管理后台",
    appVersion: "0.1.0",
    environment: "production",
    nextVersion: "16.2.0",
    reactVersion: "19.2.4",
    adminAuthMode: "Supabase Auth + admin_accounts",
    database: "Supabase PostgreSQL",
    storage: "Supabase Storage",
    auth: "Supabase Auth",
  },
}

const adminSettingsAccountListExample = {
  items: [
    {
      adminAccountId: "550e8400-e29b-41d4-a716-446655440011",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      displayName: "超级管理员",
      avatarUrl: "https://cdn.example.com/avatar/admin-1.png",
      email: "admin@example.com",
      roles: ["super_admin"],
      status: "active",
      lastLoginAt: EXAMPLE_LATEST,
      createdAt: EXAMPLE_NOW,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  stats: {
    totalAdminAccounts: 4,
    activeAdminAccounts: 3,
    inactiveAdminAccounts: 1,
    suspendedAdminAccounts: 0,
  },
}

const adminSettingsAuditLogListExample = {
  items: [
    {
      id: "550e8400-e29b-41d4-a716-446655440031",
      action: "admin_account_deactivate",
      targetType: "admin_account",
      targetId: "550e8400-e29b-41d4-a716-446655440015",
      actorAdminAccountId: "550e8400-e29b-41d4-a716-446655440011",
      actorDisplayName: "超级管理员",
      reason: "离职停用",
      createdAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const adminAIOverviewExample = {
  permissions: {
    canView: true,
    canManage: true,
  },
  stats: {
    totalProviders: 2,
    activeProviders: 2,
    totalModels: 4,
    activeModels: 4,
    totalAgents: 5,
    activeAgents: 5,
    totalSkills: 6,
    activeSkills: 5,
    invocationCountLast7Days: 218,
    failedInvocationCountLast7Days: 9,
    successRateLast7Days: 0.9587,
  },
  topAgents: [
    {
      agentCode: "learning_coach_default",
      agentName: "默认学习教练",
      invocationCount: 102,
      failedInvocationCount: 3,
    },
  ],
  recentFailures: [
    {
      invocationId: "550e8400-e29b-41d4-a716-446655440501",
      agentCode: "blocked_help_default",
      providerCode: "anthropic_prod",
      modelCode: "claude-3-7-sonnet",
      errorMessage: "provider request timed out",
      createdAt: EXAMPLE_LATEST,
    },
  ],
}

const adminAIProviderListExample = {
  items: [
    {
      providerId: "550e8400-e29b-41d4-a716-446655440510",
      code: "anthropic_prod",
      name: "Anthropic 生产环境",
      providerType: "anthropic",
      baseUrl: "https://api.anthropic.com",
      authMode: "bearer",
      secretSource: "database",
      secretMasked: "••••••••••",
      envSecretRef: "ANTHROPIC_API_KEY",
      hasStoredSecret: true,
      supportsStream: true,
      supportsJsonMode: true,
      timeoutMs: 60000,
      retryCount: 2,
      isActive: true,
      modelCount: 2,
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const adminAIProviderDetailExample = {
  provider: {
    ...adminAIProviderListExample.items[0],
    metadata: {
      env: "production",
    },
  },
  linkedModelCodes: ["claude-3-7-sonnet", "claude-3-5-haiku"],
  linkedAgentCodes: ["learning_coach_default", "blocked_help_default"],
}

const adminAIProviderSecretRevealExample = {
  apiKey: "sk-live-demo-secret",
  source: "database",
}

const adminAIProviderTestConnectionResponseExample = {
  success: true,
  message: "连接成功",
  httpStatus: 200,
  testedPath: "/models",
}

const adminAIModelTestConnectionResponseExample = {
  success: true,
  message: "连接成功",
  httpStatus: 200,
  testedPath: "/chat/completions",
}

const adminAIModelListExample = {
  items: [
    {
      modelId: "550e8400-e29b-41d4-a716-446655440520",
      providerId: "550e8400-e29b-41d4-a716-446655440510",
      providerCode: "anthropic_prod",
      code: "claude-3-7-sonnet",
      displayName: "Claude 3.7 Sonnet",
      modelName: "claude-3-7-sonnet-latest",
      supportsStream: true,
      supportsJsonMode: true,
      supportsToolCalling: false,
      maxContextTokens: 200000,
      defaultMaxOutputTokens: 8192,
      recommendedTemperature: 0.2,
      isActive: true,
      linkedAgentCount: 3,
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const adminAIModelDetailExample = {
  model: {
    ...adminAIModelListExample.items[0],
    pricingMetadata: {
      inputPerMillionUsd: 3,
      outputPerMillionUsd: 15,
    },
    metadata: {
      tier: "prod",
    },
  },
  linkedAgentCodes: ["learning_coach_default", "task_review_default"],
}

const adminAIAgentBindingListExample = {
  items: [
    {
      bindingId: "550e8400-e29b-41d4-a716-446655440530",
      agentCode: "learning_coach_default",
      agentName: "默认学习教练",
      toolId: "550e8400-e29b-41d4-a716-446655440540",
      toolCode: "cursor",
      toolName: "Cursor",
      learningLevel: "beginner",
      selectionMode: "preset_training",
      pathId: "550e8400-e29b-41d4-a716-446655440550",
      pathCode: "cursor-beginner-01",
      pathName: "Cursor 入门训练营",
      stepNo: 1,
      interactionType: "teaching",
      priority: 100,
      isActive: true,
      metadata: {
        reason: "默认首关命中规则",
      },
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  agentOptions: [
    {
      code: "learning_coach_default",
      name: "默认学习教练",
    },
  ],
  toolOptions: [
    {
      id: "550e8400-e29b-41d4-a716-446655440540",
      code: "cursor",
      name: "Cursor",
    },
  ],
  pathOptions: [
    {
      id: "550e8400-e29b-41d4-a716-446655440550",
      code: "cursor-beginner-01",
      name: "Cursor 入门训练营",
    },
  ],
}

const adminAIAgentSkillBindingListExample = {
  items: [
    {
      bindingId: "550e8400-e29b-41d4-a716-446655440560",
      agentCode: "learning_coach_default",
      agentName: "默认学习教练",
      skillCode: "repo_context_reader",
      skillName: "仓库上下文读取",
      priority: 100,
      isRequired: true,
      contextBudgetTokens: 1200,
      isActive: true,
      metadata: {
        stage: "default",
      },
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  agentOptions: [
    {
      code: "learning_coach_default",
      name: "默认学习教练",
    },
  ],
  skillOptions: [
    {
      code: "repo_context_reader",
      name: "仓库上下文读取",
    },
  ],
}

const adminAIAgentListExample = {
  items: [
    {
      agentId: "550e8400-e29b-41d4-a716-446655440570",
      code: "learning_coach_default",
      name: "默认学习教练",
      scenarioType: "teaching",
      providerCode: "anthropic_prod",
      modelCode: "claude-3-7-sonnet",
      streamEnabled: true,
      isActive: true,
      bindingCount: 2,
      skillCount: 2,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const adminAIAgentDetailExample = {
  agent: {
    agentId: "550e8400-e29b-41d4-a716-446655440570",
    code: "learning_coach_default",
    name: "默认学习教练",
    scenarioType: "teaching",
    description: "主学习路径默认教练。",
    systemPromptTemplate: "你是中文 AI 编程学习教练，请结合当前任务上下文指导用户。",
    developerPromptTemplate: "优先按步骤输出，不要跳步。",
    defaultProviderCode: "anthropic_prod",
    defaultModelCode: "claude-3-7-sonnet",
    contextMessageLimit: 12,
    maxOutputTokens: 4096,
    temperature: 0.2,
    topP: 0.9,
    streamEnabled: true,
    isActive: true,
    metadata: {
      owner: "ai_ops",
    },
    version: 3,
    createdAt: EXAMPLE_NOW,
    updatedAt: EXAMPLE_LATEST,
  },
  bindings: adminAIAgentBindingListExample.items,
  skillBindings: adminAIAgentSkillBindingListExample.items,
}

const adminAISkillListExample = {
  items: [
    {
      skillId: "550e8400-e29b-41d4-a716-446655440580",
      code: "repo_context_reader",
      name: "仓库上下文读取",
      version: "1.0.0",
      sourceType: "built_in",
      trustLevel: "internal_verified",
      rootPath: "/skills/repo_context_reader",
      manifestPath: "/skills/repo_context_reader/SKILL.md",
      entryResourcePath: null,
      scriptsEnabled: true,
      isActive: true,
      metadata: {
        category: "context",
      },
      linkedAgentCount: 3,
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

const adminAIInvocationListExample = {
  items: [
    {
      invocationId: "550e8400-e29b-41d4-a716-446655440590",
      sessionId: "550e8400-e29b-41d4-a716-446655440591",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      providerCode: "anthropic_prod",
      modelCode: "claude-3-7-sonnet",
      agentCode: "learning_coach_default",
      status: "succeeded",
      streamEnabled: true,
      totalTokens: 1680,
      latencyMs: 1830,
      finishReason: "stop",
      errorCode: null,
      createdAt: EXAMPLE_LATEST,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  providerOptions: [
    {
      code: "anthropic_prod",
      name: "Anthropic 生产环境",
    },
  ],
  modelOptions: [
    {
      code: "claude-3-7-sonnet",
      name: "Claude 3.7 Sonnet",
    },
  ],
  agentOptions: [
    {
      code: "learning_coach_default",
      name: "默认学习教练",
    },
  ],
}

const adminAIInvocationDetailExample = {
  invocation: {
    invocationId: "550e8400-e29b-41d4-a716-446655440590",
    sessionId: "550e8400-e29b-41d4-a716-446655440591",
    assistantMessageId: "550e8400-e29b-41d4-a716-446655440592",
    userMessageId: "550e8400-e29b-41d4-a716-446655440593",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    providerCode: "anthropic_prod",
    modelCode: "claude-3-7-sonnet",
    agentCode: "learning_coach_default",
    status: "succeeded",
    streamEnabled: true,
    promptTokens: 1280,
    completionTokens: 400,
    totalTokens: 1680,
    latencyMs: 1830,
    firstChunkLatencyMs: 420,
    finishReason: "stop",
    errorCode: null,
    errorMessage: null,
    requestPayloadRedacted: {
      messages: ["..."],
    },
    responsePayloadRedacted: {
      content: "先确认你当前报错发生在哪一步。",
    },
    createdAt: EXAMPLE_LATEST,
  },
}

const adminAIResolvePreviewExample = {
  matchedBinding: {
    bindingId: "550e8400-e29b-41d4-a716-446655440530",
    agentCode: "learning_coach_default",
    priority: 100,
    specificityScore: 5.5,
  },
  agent: {
    code: "learning_coach_default",
    name: "默认学习教练",
    providerCode: "anthropic_prod",
    modelCode: "claude-3-7-sonnet",
  },
  matchedSkills: [
    {
      bindingId: "550e8400-e29b-41d4-a716-446655440560",
      skillCode: "repo_context_reader",
      skillName: "仓库上下文读取",
      priority: 100,
    },
  ],
}

const adminAITestExample = {
  invocationId: "550e8400-e29b-41d4-a716-446655440594",
  providerCode: "anthropic_prod",
  modelCode: "claude-3-7-sonnet",
  agentCode: "learning_coach_default",
  status: "succeeded",
  content: "建议先确认项目目录是否已正确索引，再继续执行下一步命令。",
  finishReason: "stop",
  usage: {
    promptTokens: 98,
    completionTokens: 135,
    totalTokens: 233,
  },
  latencyMs: 1510,
  requestPayloadRedacted: {
    prompt: "[redacted]",
  },
  responsePayloadRedacted: {
    outputText: "建议先确认项目目录是否已正确索引，再继续执行下一步命令。",
  },
}

const analyticsTrackEventExample = {
  eventId: "550e8400-e29b-41d4-a716-446655440601",
  accepted: true,
}

const notificationSettingsExample = {
  checkinReminder: true,
  checkinTime: "09:00",
  progressPush: true,
  remindMethods: {
    app: true,
    email: false,
    wechat: false,
  },
  doNotDisturb: false,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
}

const notificationListExample = {
  items: [
    {
      id: "550e8400-e29b-41d4-a716-446655440602",
      type: "daily_checkin_reminder",
      title: "今天还没打卡",
      content: "现在已经到 09:00 了，去完成今天的学习打卡，保持连续进度。",
      status: "unread",
      payload: {
        actionHref: "/achievements",
        actionLabel: "立即打卡",
      },
      createdAt: EXAMPLE_NOW,
      updatedAt: EXAMPLE_NOW,
      scheduledFor: EXAMPLE_NOW,
      readAt: null,
      dismissedAt: null,
      actionHref: "/achievements",
      actionLabel: "立即打卡",
    },
  ],
  unreadCount: 1,
}

const notificationMutationExample = {
  id: "550e8400-e29b-41d4-a716-446655440602",
  status: "read",
  readAt: EXAMPLE_LATER,
  dismissedAt: null,
}

const successExamples = {
  authLogin: {
    userId: "user-123",
    isNewUser: false,
    onboardingCompleted: true,
    profileCompleted: true,
    redirectTo: "/learn",
  },
  authSession: {
    userId: "user-123",
    redirectTo: "/learn",
    phone: "13800000000",
    nickname: "Bao",
  },
  profileMe: profileMeExample,
  profileAvatar: {
    avatarUrl: "https://cdn.example.com/avatar/user-123.png",
    storagePath: "avatars/user-123/1711846800000-uuid.png",
    previousAvatarUrl: "https://cdn.example.com/avatar/user-123-old.png",
  },
  onboardingTools: {
    groups: [
      {
        groupCode: "gui",
        groupName: "图形化工具",
        tools: [
          {
            id: "tool-cursor",
            code: "cursor",
            name: "Cursor",
            difficultyLevel: "beginner",
            summary: "从零开始学习 AI 辅助编程。",
            category: "图形化工具",
            popular: true,
            color: "brand",
          },
        ],
      },
    ],
  },
  onboardingPathOptions: {
    selfStudyOption: {
      id: "self-study-cursor-beginner",
      code: "self-study-cursor-beginner",
      name: "自主学习模式",
      sourceType: "self_directed",
      summary: "把你手头的教程或报错贴进来，我们按步骤陪你练。",
      preview: ["粘贴资料", "拆成任务", "边练边问"],
      inputTypes: ["教程文本", "代码片段", "网页链接", "截图"],
    },
    presetPathOptions: [
      {
        pathId: "path-cursor-beginner-01",
        code: "cursor-beginner-01",
        name: "Cursor 入门训练营",
        sourceType: "preset_training",
        stageCount: 5,
        summary: "完成第一次索引、问答和改代码闭环。",
        recommended: true,
        currentLevelFit: "适合第一次接触 Cursor 的学习者",
        coachAgentLabel: "入门教练",
        estimatedDuration: "5 天",
        tags: ["安装", "索引", "补全"],
        preview: ["搭好环境", "看懂建议", "完成第一次提交"],
      },
    ],
  },
  onboardingComplete: {
    onboardingCompleted: true,
    primaryToolCode: "cursor",
    learningLevel: "beginner",
    selectionMode: "preset_training",
    pathId: "path-cursor-beginner-01",
    currentTaskId: "task-1",
    initialPreview: ["先确认环境", "打开项目", "尝试第一次提问"],
    redirectTo: "/learn",
  },
  learningRestartConversation: {
    restarted: true,
    closedSessionId: "conversation-1",
  },
  learningRestartConversationNoop: {
    restarted: false,
    closedSessionId: null,
    message: "当前没有进行中的对话。",
  },
  learningCurrentSession: {
    conversationId: "conversation-1",
    historyPagination: {
      hasMore: false,
      nextBeforeSequenceNo: null,
    },
    pendingMaterialPlanDraft: null,
    path: {
      id: "path-runtime-1",
      status: "in_progress",
    },
    task: {
      taskId: "task-1",
      title: "完成第一次代码补全",
      status: "in_progress",
    },
    profile: profileMeExample,
    planSummary: {
      selectedToolName: "Cursor",
      learningLevelLabel: "入门",
      selectionModeLabel: "预设训练",
      selectionMode: "preset_training" as const,
      pathName: "Cursor 入门训练营",
    },
    mission: {
      title: "完成第一次代码补全",
      tool: "Cursor",
      stageLabel: "第 1 关",
      goal: "在编辑器里完成一次真实补全",
      summary: "学会在具体代码上下文里请求补全。",
      estimatedTime: "15 分钟",
      reward: "+20 XP",
      progressLabel: "已完成 2 / 5",
      progressPercent: 40,
      coachCue: "先选中一小段代码，再描述你想要的改动。",
      nextUnlockTitle: "第一次智能重构",
      nextUnlockSummary: "下一步会让 AI 帮你整理已有代码。",
      nextPreviewIsFinal: false,
    },
    resume: {
      title: "回到上次练习",
      summary: "继续完成 Cursor 入门训练营。",
      lastSeenLabel: "上次停留在 5 分钟前",
      ctaLabel: "继续练习",
    },
    messages: [messageExample],
    quickActions: [
      {
        label: "我卡住了",
        tone: "warning",
        helper: "把当前报错贴给我。",
        category: "help",
      },
    ],
    supportOptions: [
      {
        mode: "hint",
        label: "给我一点提示",
        description: "只给下一步提醒，不直接给答案。",
        prompt: "请给我下一步提示。",
      },
    ],
    responseSamples: [
      {
        trigger: "我已经完成了",
        kind: "task_feedback",
        title: "教练反馈",
        content: "把你的结果贴给我，我来帮你确认。",
      },
    ],
    rightPanel: {
      currentStep: "打开项目并索引代码库",
      whyThisStep: "后续问答和改代码都依赖索引结果。",
      completionCriteria: "项目索引成功，能看到代码建议。",
      hintIfStuck: "先确认目录是否正确、文件是否已加载。",
      knowledgePoints: ["索引", "上下文", "补全"],
      masteryPoints: ["知道何时需要重新索引"],
      cautions: [
        {
          text: "不要一次索引过大的无关目录。",
          isTrap: true,
        },
      ],
      nextStepPreview: "下一步会练习如何提一个好的上下文问题。",
    },
    recentPracticeRounds: [
      {
        id: "round-1",
        taskTitle: "完成第一次代码补全",
        stageLabel: "第 1 关",
        lastActiveLabel: "5 分钟前",
        status: "in_progress",
      },
    ],
    tasks: [
      {
        id: 1,
        label: "安装并登录 Cursor",
        done: true,
      },
      {
        id: 2,
        label: "完成第一次代码补全",
        done: false,
        current: true,
      },
    ],
    knowledgeTags: [
      {
        label: "上下文提问",
        color: "text-brand bg-brand-dim border-brand/20",
      },
    ],
  },
  learningMessage: {
    conversationId: "conversation-1",
    taskId: "task-1",
    message: messageExample,
    taskState: "in_progress",
    taskPatch: null,
  },
  learningMessages: {
    conversationId: "conversation-1",
    messages: [messageExample],
    pagination: {
      hasMore: false,
      nextBeforeSequenceNo: null,
    },
  },
  learningPlanFromMaterial: {
    processingMode: "async" as const,
    intakeId: "22222222-2222-4222-8222-222222222222",
    runId: "33333333-3333-4333-8333-333333333333",
    draftId: null,
    status: "queued" as const,
  },
  materialIntakeStatus: {
    intakeId: "22222222-2222-4222-8222-222222222222",
    status: "planning" as const,
    processingStage: "planning",
    progressPercent: 65,
    progressMessage: "正在生成学习计划草稿",
    draftId: null,
    runId: "33333333-3333-4333-8333-333333333333",
    errorCode: null,
    errorMessage: null,
  },
  learningPlanDraftDetail: {
    draftId: "11111111-1111-4111-8111-111111111111",
    intakeId: "22222222-2222-4222-8222-222222222222",
    inputContext: {
      links: ["https://web.dev/learn/"],
      userGoal: "我想跟着教程做一个最小可运行的页面练习",
      weeklyHours: 6,
      currentConstraints: "希望 2 周内完成，优先项目实战",
    },
    title: "两周内跑通一个 Next.js 页面改造闭环",
    goal: "把教程知识转成一个可执行、可确认的页面改造练习。",
    status: "draft" as const,
    revisionNo: 2,
    qualityStatus: "passed",
    qualityReport: {
      status: "passed" as const,
      checks: [
        {
          code: "TASK_COUNT_RANGE",
          passed: true,
          message: "任务数需在 3 到 8 之间。",
        },
      ],
      warnings: ["公开页可提取文本较少，已通过字幕补足。"],
      selfCheck: {
        enabled: false,
        decision: "skipped" as const,
        reason: "未配置 quality-check 模型，已跳过自检。",
      },
      fallbackReason: null,
    },
    alignmentTable: [],
    week1TaskIds: ["44444444-4444-4444-8444-444444444444"],
    updatedAt: EXAMPLE_LATEST,
    tasks: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        taskNo: 1,
        position: 1,
        title: "通读教程并确认运行环境",
        objective: "先把官方教程跑通，明确本次练习的改造目标。",
        practiceSteps: ["阅读教程", "启动项目", "记录基线页面"],
        acceptanceCriteria: "项目可运行，并能说明本次要改的页面。",
        estimatedMinutes: 30,
        sourceRefs: ["u1-chunk-0"],
        goalAlignmentRefs: [],
        masteryPoints: ["知道本次练习要改哪一页", "知道项目成功启动的判断标准"],
        cautions: [
          {
            text: "不要一开始就改页面代码，先确认教程项目能稳定跑起来。",
            isTrap: true,
          },
        ],
        recommendedForWeek1: true,
        isUserEdited: false,
      },
    ],
  },
  learningPlanDraftConfirm: {
    learningPathId: "path-runtime-2",
    currentTaskId: "task-runtime-1",
    redirectTo: "/learn",
  },
  taskComplete: {
    taskId: "task-1",
    taskStatus: "completed",
    scoreDelta: 20,
    currentScore: 140,
    currentRank: "新手学徒",
    rankChanged: false,
    completionSummary: "你已经完成第一次真实补全。",
    nextTask: {
      taskId: "task-2",
      title: "第一次智能重构",
    },
  },
  taskUpdateStatus: {
    taskId: "task-1",
    taskStatus: "blocked",
    reason: "索引一直失败，无法进入下一步。",
  },
  checkinDaily: {
    checkedIn: true,
    alreadyCheckedIn: false,
    checkinDate: "2026-03-31",
    scoreDelta: 5,
    streakDays: 3,
    currentScore: 125,
    currentRank: "新手学徒",
    rankChanged: false,
  },
  analyticsTrackEvent: analyticsTrackEventExample,
  notificationSettings: notificationSettingsExample,
  notificationList: notificationListExample,
  notificationMutation: notificationMutationExample,
  progressCurrent: {
    currentTool: {
      id: "tool-cursor",
      label: "Cursor",
    },
    currentPathName: "Cursor 入门训练营",
    currentTaskTitle: "完成第一次代码补全",
    currentScore: 120,
    currentRank: "新手学徒",
    streakDays: 3,
    checkedInToday: true,
    summary: {
      totalXP: 120,
      currentRank: "新手学徒",
      nextRank: "进阶学员",
      remainingXPToNextRank: 80,
      streakDays: 3,
    },
  },
  progressMap: {
    pathName: "Cursor 入门训练营",
    pathSummary: "从环境搭建到第一次真实改代码。",
    totalSteps: 5,
    completedSteps: 2,
    currentStageId: 3,
    stages: [
      {
        id: 1,
        taskId: "task-1",
        title: "安装并登录 Cursor",
        summary: "完成基础环境准备。",
        goal: "能正常打开项目。",
        completionCriteria: "成功进入编辑器并打开项目。",
        reviewSummary: "环境准备完成。",
        xp: 20,
        status: "done",
        tags: ["安装"],
        keyPoints: ["登录", "打开项目"],
        pitfalls: [],
        estimatedTime: "10 分钟",
        focus: "完成第一次启动",
      },
    ],
  },
  achievementSummary: {
    currentRankCode: "rookie",
    currentRank: "新手学徒",
    currentScore: 120,
    checkedInToday: true,
    nextRank: "进阶学员",
    nextRankRemainingXP: 80,
    completedTaskCount: 5,
    streakDays: 3,
    overview: {
      totalXP: 120,
      streakDays: 3,
      monthlyXP: 85,
      totalCheckinDays: 10,
      nextRankRemainingXP: 80,
      earnedBadges: 2,
    },
    ranks: [
      {
        code: "rookie",
        name: "新手学徒",
        minScore: 0,
        maxScore: 199,
      },
    ],
    badges: [
      {
        code: "first_task",
        title: "第一关通关",
        desc: "完成第一项学习任务。",
        earned: true,
      },
    ],
    history: [
      {
        label: "完成第一次代码补全",
        xp: 20,
        time: EXAMPLE_NOW,
        type: "task",
      },
    ],
    calendar: {
      weekDays: ["一", "二", "三", "四", "五", "六", "日"],
      dates: [[31]],
      checkins: [[true]],
    },
  },
  historyRecent: {
    items: [historyItemExample],
    total: 1,
    page: 1,
    hasMore: false,
    filter: "all",
    summary: {
      activeCount: 1,
      interruptedCount: 0,
      completedCount: 2,
      abandonedCount: 0,
      totalCount: 3,
      activePlanId: "path-runtime-1",
      canCreateNewPlan: false,
    },
  },
  historyDetail: {
    detail: {
      item: historyItemExample,
      timeline: {
        startedAt: EXAMPLE_NOW,
        lastActivityAt: EXAMPLE_LATEST,
        completedAt: null,
        interruptedAt: null,
        abandonedAt: null,
      },
      steps: [
        {
          id: "step-1",
          stepNo: 1,
          title: "安装并登录 Cursor",
          status: "completed",
          rewardXp: 20,
          completedAt: EXAMPLE_LATER,
        },
      ],
    },
  },
  historyStatus: {
    pathId: "path-runtime-1",
    status: "abandoned",
  },
  feedbackCreate: {
    ticketId: "ticket-1",
  },
  feedbackMineList: {
    items: [
      {
        id: "ticket-1",
        feedbackType: "feature_request",
        feedbackTypeLabel: "功能建议",
        status: "replied",
        statusLabel: "已回复",
        title: "希望支持项目级模板",
        contentPreview: "如果能直接从项目生成学习路径会更方便。",
        contactMethod: "bao@example.com",
        latestReplySnippet: "已经收到你的反馈，我们会继续跟进。",
        replyCount: 1,
        submittedAt: EXAMPLE_NOW,
        updatedAt: EXAMPLE_LATEST,
        lastReplyAt: EXAMPLE_LATER,
      },
    ],
  },
  feedbackDetail: {
    id: "ticket-1",
    feedbackType: "feature_request",
    feedbackTypeLabel: "功能建议",
    status: "replied",
    statusLabel: "已回复",
    title: "希望支持项目级模板",
    content: "如果能直接从项目生成学习路径会更方便。",
    contactMethod: "bao@example.com",
    submittedAt: EXAMPLE_NOW,
    updatedAt: EXAMPLE_LATEST,
    lastReplyAt: EXAMPLE_LATER,
    replies: [feedbackReplyExample],
  },
  adminSession: {
    adminAccountId: "f34db0f3-dc90-45a6-9c66-ef8358cbd521",
    userId: "8f0be367-2be6-4e40-838a-fbd643d16e29",
    displayName: "管理员程左",
    avatarUrl: "https://cdn.example.com/avatar/admin-1.png",
    roles: ["super_admin"],
    status: "active",
  },
  adminDashboardOverview: {
    generatedAt: EXAMPLE_NOW,
    pendingFeedbackCount: 12,
    todayNewUserCount: 7,
    todayCompletedTaskCount: 38,
    activeLearningPathCount: 116,
    todayCheckinCount: 42,
    todayOnboardingCompletedCount: 5,
    metrics: {
      todayNewUsers: { value: 7, trend: "up", comparisonLabel: "+12.5%" },
      todayOnboardingCompleted: { value: 5, trend: "up", comparisonLabel: "+8.2%" },
      activeLearningPaths: { value: 116, trend: "neutral", comparisonLabel: null },
      todayCompletedTasks: { value: 38, trend: "down", comparisonLabel: "-5.4%" },
      todayCheckinUsers: { value: 42, trend: "up", comparisonLabel: "+18.3%" },
      pendingFeedback: { value: 12, trend: "neutral", comparisonLabel: null },
      aiSuccessRate24h: { value: 98.7, trend: "up", comparisonLabel: "+0.3%" },
      aiAvgLatencyMs24h: { value: 1234, trend: "up", comparisonLabel: "-87ms" },
    },
    aiHourlySuccess: [{ time: "10:00", successRate: 99.1 }],
    weeklyActiveByDay: [{ day: "周一", activeUsers: 120 }],
    weeklyActiveSubtitle: "基于 event_logs 去重用户（本周）",
    recentFeedback: [],
    aiHealth: [],
    canViewAiCharts: true,
  },
  adminFeedbackList: {
    items: [
      {
        id: "ticket-1",
        feedbackType: "feature_request",
        feedbackTypeLabel: "功能建议",
        status: "replied",
        statusLabel: "已解决",
        title: "希望支持项目级模板",
        contentPreview: "如果能直接从项目生成学习路径会更方便。",
        contactMethod: "bao@example.com",
        latestReplySnippet: "已经收到你的反馈，我们会继续跟进。",
        replyCount: 1,
        submittedAt: EXAMPLE_NOW,
        updatedAt: EXAMPLE_LATEST,
        lastReplyAt: EXAMPLE_LATER,
        userId: "user-123",
        userNicknameSnapshot: "Bao",
        userAvatarUrl: "https://cdn.example.com/avatar/user-123.png",
        userPhoneSnapshot: "13800000000",
        userContactEmailSnapshot: "bao@example.com",
        priority: "medium",
        source: "settings_popover",
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
    stats: {
      ticketTotal: 128,
      pending: 12,
      inReview: 7,
      highPriority: 4,
    },
  },
  adminFeedbackDetail: adminFeedbackDetailExample,
  adminUserExportRow: adminUserExportRowExample,
  adminUserList: {
    items: [adminUserExportRowExample],
    total: 1,
    page: 1,
    limit: 20,
  },
  adminLearningPathList: adminLearningPathListExample,
  adminLearningPathDetail: adminLearningPathDetailExample,
  adminLearningPathStatusUpdate: {
    pathId: "550e8400-e29b-41d4-a716-446655440100",
    status: "archived",
  },
  adminSettingsOverview: adminSettingsOverviewExample,
  adminSettingsAccountList: adminSettingsAccountListExample,
  adminSettingsAccountStatusUpdate: {
    adminAccountId: "550e8400-e29b-41d4-a716-446655440015",
    status: "inactive",
  },
  adminSettingsAuditLogList: adminSettingsAuditLogListExample,
  adminAIOverview: adminAIOverviewExample,
  adminAIProviderList: adminAIProviderListExample,
  adminAIProviderDetail: adminAIProviderDetailExample,
  adminAIProviderSecretReveal: adminAIProviderSecretRevealExample,
  adminAIProviderTestConnectionOk: adminAIProviderTestConnectionResponseExample,
  adminAIModelTestConnectionOk: adminAIModelTestConnectionResponseExample,
  adminAIModelList: adminAIModelListExample,
  adminAIModelDetail: adminAIModelDetailExample,
  adminAIAgentList: adminAIAgentListExample,
  adminAIAgentDetail: adminAIAgentDetailExample,
  adminAIAgentBindingList: adminAIAgentBindingListExample,
  adminAISkillList: adminAISkillListExample,
  adminAIAgentSkillBindingList: adminAIAgentSkillBindingListExample,
  adminAIInvocationList: adminAIInvocationListExample,
  adminAIInvocationDetail: adminAIInvocationDetailExample,
  adminAIResolvePreview: adminAIResolvePreviewExample,
  adminAITest: adminAITestExample,
} as const

const defaultErrorResponses = {
  "400": {
    description: "请求参数不合法或请求体格式不正确。",
    example: {
      code: "BAD_REQUEST",
      message: "请求参数不合法。",
      data: null,
    },
  },
  "401": {
    description: "未登录、登录态失效，或缺少访问令牌。",
    example: {
      code: "AUTH_REQUIRED",
      message: "请先登录后再访问该接口。",
      data: null,
    },
  },
  "403": {
    description: "管理员密钥无效，或当前调用方没有权限访问该接口。",
    example: {
      code: "FORBIDDEN",
      message: "管理员凭证无效。",
      data: null,
    },
  },
      "404": {
        description: "请求的资源不存在，或当前用户无权访问该资源。",
        example: {
          code: "NOT_FOUND",
          message: ROUTE_ERROR_MESSAGES.historyPlanNotFound,
          data: null,
        },
      },
  "409": {
    description: "请求与当前资源状态冲突，需先处理前置条件。",
    example: {
      code: "CONFLICT",
      message: "当前已有进行中的学习计划",
      data: null,
    },
  },
  "422": {
    description: "请求字段通过了 JSON 结构解析，但未通过业务校验。",
    example: {
      code: "VALIDATION_FAILED",
      message: "请求字段未通过校验。",
      data: null,
    },
  },
  "500": {
    description: "服务端处理失败，请稍后重试。",
    example: {
      code: "INTERNAL_ERROR",
      message: "服务端处理失败。",
      data: null,
    },
  },
  "502": {
    description: "下游 AI Provider 调用失败，当前请求未成功完成。",
    example: {
      code: "AI_PROVIDER_ERROR",
      message: "AI 服务暂时不可用，请稍后再试。",
      data: null,
    },
  },
  "413": {
    description: "导出结果超过允许的最大行数。",
    example: {
      code: "USER_EXPORT_LIMIT_EXCEEDED",
      message: "导出行数超过上限，请缩小筛选条件（最多 10000 行）。",
      data: null,
    },
  },
} as const

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Supabase access token。Swagger UI 会在已登录状态下自动注入。",
})

registry.registerComponent("securitySchemes", "adminSecretHeader", {
  type: "apiKey",
  in: "header",
  name: "x-admin-secret",
  description: "管理员接口密钥。",
})

function jsonResponse(
  schema: z.ZodTypeAny,
  description: string,
  example?: unknown,
) {
  return {
    description,
    content: {
      "application/json": {
        schema,
        ...(example === undefined ? {} : { example }),
      },
    },
  }
}

function successResponse(
  schema: z.ZodTypeAny,
  name: string,
  description: string,
  dataExample: unknown,
  message = "success",
) {
  return jsonResponse(
    createApiSuccessResponseSchema(schema, name),
    description,
    {
      code: "OK",
      message,
      data: dataExample,
    },
  )
}

function commonErrorResponses(
  statuses: string[],
  overrides?: Partial<Record<string, { description: string; example: unknown }>>,
) {
  const responses: Record<string, ReturnType<typeof jsonResponse>> = {}

  for (const status of statuses) {
    const spec = overrides?.[status] ?? defaultErrorResponses[status as keyof typeof defaultErrorResponses]

    responses[status] = jsonResponse(
      ApiErrorResponseSchema,
      spec?.description ?? "错误响应",
      spec?.example,
    )
  }

  return responses
}

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  operationId: "postAuthLogin",
  tags: ["auth"],
  summary: "完成登录流程并返回跳转摘要",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: authLoginRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      authLoginResponseDataSchema,
      "AuthLoginResponse",
      "登录成功",
      successExamples.authLogin,
    ),
    ...commonErrorResponses(["400", "401", "500"], {
      "400": {
        description: "请求体中的 `loginType` 不合法。",
        example: {
          code: "BAD_REQUEST",
          message: "loginType 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/auth/session",
  operationId: "getAuthSession",
  tags: ["auth"],
  summary: "读取当前登录会话摘要",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      authSessionSummaryResponseDataSchema,
      "AuthSessionResponse",
      "会话读取成功",
      successExamples.authSession,
    ),
    ...commonErrorResponses(["401", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/profile/me",
  operationId: "getProfileMe",
  tags: ["profile"],
  summary: "获取当前用户档案",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      profileMeResponseDataSchema,
      "ProfileMeResponse",
      "档案读取成功",
      successExamples.profileMe,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/profile/me",
  operationId: "patchProfileMe",
  tags: ["profile"],
  summary: "更新当前用户档案",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateProfileMeRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      profileMeResponseDataSchema,
      "ProfileMeUpdateResponse",
      "档案更新成功",
      successExamples.profileMe,
      "profile updated",
    ),
    ...commonErrorResponses(["400", "401", "404", "500"], {
      "400": {
        description: "请求体格式错误，或昵称/邮箱/头像链接等字段未通过业务校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "昵称至少需要 2 个字符。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/profile/avatar",
  operationId: "postProfileAvatar",
  tags: ["profile"],
  summary: "上传头像",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: uploadProfileAvatarRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      uploadProfileAvatarResponseDataSchema,
      "UploadProfileAvatarResponse",
      "头像上传成功",
      successExamples.profileAvatar,
      "avatar uploaded",
    ),
    ...commonErrorResponses(["400", "401", "500"], {
      "400": {
        description: "缺少文件，或上传文件类型/大小未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "头像仅支持 JPG、PNG、WebP 格式。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/onboarding/tools",
  operationId: "getOnboardingTools",
  tags: ["onboarding"],
  summary: "获取 onboarding 工具选项",
  responses: {
    "200": successResponse(
      getOnboardingToolsResponseDataSchema,
      "OnboardingToolsResponse",
      "工具列表读取成功",
      successExamples.onboardingTools,
    ),
    ...commonErrorResponses(["500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/onboarding/path-options",
  operationId: "getOnboardingPathOptions",
  tags: ["onboarding"],
  summary: "按工具和水平获取路径选项",
  request: {
    query: getOnboardingPathOptionsQuerySchema,
  },
  responses: {
    "200": successResponse(
      getOnboardingPathOptionsResponseDataSchema,
      "OnboardingPathOptionsResponse",
      "路径选项读取成功",
      successExamples.onboardingPathOptions,
    ),
    ...commonErrorResponses(["400", "404", "500"], {
      "400": {
        description: "缺少合法的 `toolCode` 或 `learningLevel` 查询参数。",
        example: {
          code: "BAD_REQUEST",
          message: "缺少合法的 toolCode 或 learningLevel。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/onboarding/complete",
  operationId: "postOnboardingComplete",
  tags: ["onboarding"],
  summary: "完成 onboarding 并激活学习路径",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: completeOnboardingRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      completeOnboardingResponseDataSchema,
      "OnboardingCompleteResponse",
      "onboarding 完成",
      successExamples.onboardingComplete,
    ),
    ...commonErrorResponses(["400", "401", "404", "422", "500"], {
      "400": {
        description: "请求体结构不正确，无法完成 onboarding。",
        example: {
          code: "BAD_REQUEST",
          message: "请求体格式不正确。",
          data: null,
        },
      },
      "422": {
        description: "请求体字段通过了解析，但学习等级或选择模式未通过业务校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "learningLevel 或 selectionMode 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/learning/current-session",
  operationId: "getLearningCurrentSession",
  tags: ["learning"],
  summary: "获取当前学习会话",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      learningCurrentSessionResponseDataSchema,
      "LearningCurrentSessionResponse",
      "学习会话读取成功",
      successExamples.learningCurrentSession,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/restart-conversation",
  operationId: "postLearningRestartConversation",
  tags: ["learning"],
  summary: "归档当前关卡活跃对话并清空任务会话指针，以便重新开始",
  description:
    "将当前任务下 status=active 且非管理员测试的 conversation_sessions 标记为 archived，并把 user_tasks.last_conversation_id 置空。若无活跃会话则返回 restarted=false。",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      learningRestartConversationResponseDataSchema,
      "LearningRestartConversationResponse",
      "操作结果",
      successExamples.learningRestartConversation,
    ),
    ...commonErrorResponses(["401", "404", "429", "500"], {
      "429": {
        description: "短时间内重复调用触发限流。",
        example: {
          code: "RATE_LIMITED",
          message: "操作过于频繁，请稍后再试。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/message",
  operationId: "postLearningMessage",
  tags: ["learning"],
  summary: "发送学习消息，支持 JSON 和 SSE",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: learningMessageRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": {
      description: "消息发送成功",
      content: {
        "application/json": {
          schema: createApiSuccessResponseSchema(learningMessageResponseDataSchema, "LearningMessageResponse"),
          example: {
            code: "OK",
            message: "success",
            data: successExamples.learningMessage,
          },
        },
        "text/event-stream": {
          schema: openApiStreamResponseSchema,
          example: "event: message\ndata: {\"code\":\"OK\",\"message\":\"success\"}\n\n",
        },
      },
    },
    ...commonErrorResponses(["401", "422", "500", "502"], {
      "422": {
        description: "请求体不是合法 JSON，或消息字段未通过业务校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "请求体不是合法 JSON。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/learning/messages",
  operationId: "getLearningMessages",
  tags: ["learning"],
  summary: "分页获取历史学习消息",
  security: [{ bearerAuth: [] }],
  request: {
    query: learningMessagesQuerySchema,
  },
  responses: {
    "200": successResponse(
      learningMessagesResponseDataSchema,
      "LearningMessagesResponse",
      "历史消息读取成功",
      successExamples.learningMessages,
    ),
    ...commonErrorResponses(["401", "404", "422", "500"], {
      "422": {
        description: "查询参数格式正确但未通过业务校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "conversationId 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/plan-from-material",
  operationId: "postLearningPlanFromMaterial",
  tags: ["learning"],
  summary: "根据教程链接提交异步学习计划草稿生成任务",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: learningPlanFromMaterialRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      learningPlanFromMaterialResponseDataSchema,
      "LearningPlanFromMaterialResponse",
      "材料 intake 已提交",
      successExamples.learningPlanFromMaterial,
    ),
    ...commonErrorResponses(["401", "422", "500", "502"], {
      "422": {
        description: "链接数量、域名、周学习时长或业务约束未通过校验。",
        example: {
          code: "MATERIAL_UNSUPPORTED_SOURCE",
          message: "当前链接域名暂不在首期支持范围内。",
          data: null,
        },
      },
      "502": {
        description: "上游 AI 提供方调用失败。",
        example: {
          code: "AI_PROVIDER_ERROR",
          message: "AI 服务暂时不可用，请稍后重试。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/learning/material-intakes/{id}",
  operationId: "getLearningMaterialIntakeStatus",
  tags: ["learning"],
  summary: "读取教程材料 intake 的异步生成状态",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      materialIntakeStatusResponseDataSchema,
      "MaterialIntakeStatusResponse",
      "材料 intake 状态读取成功",
      successExamples.materialIntakeStatus,
    ),
    ...commonErrorResponses(["401", "404", "500"], {
      "404": {
        description: "材料 intake 不存在，或不属于当前用户。",
        example: {
          code: "MATERIAL_INTAKE_NOT_FOUND",
          message: "材料摄取记录不存在。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/learning/plan-drafts/{id}",
  operationId: "patchLearningPlanDraft",
  tags: ["learning"],
  summary: "更新学习计划草稿内容",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: learningPlanDraftPatchRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      learningPlanDraftDetailResponseDataSchema,
      "LearningPlanDraftPatchResponse",
      "草稿更新成功",
      successExamples.learningPlanDraftDetail,
    ),
    ...commonErrorResponses(["401", "404", "409", "422", "500"], {
      "404": {
        description: "草稿不存在，或不属于当前用户。",
        example: {
          code: "PLAN_DRAFT_NOT_FOUND",
          message: "当前学习计划草稿不存在。",
          data: null,
        },
      },
      "409": {
        description: "草稿状态不允许编辑。",
        example: {
          code: "PLAN_DRAFT_ALREADY_CONFIRMED",
          message: "仅草稿状态可以编辑。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/learning/plan-drafts/{id}",
  operationId: "getLearningPlanDraft",
  tags: ["learning"],
  summary: "读取学习计划草稿详情",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      learningPlanDraftDetailResponseDataSchema,
      "LearningPlanDraftDetailResponse",
      "草稿读取成功",
      successExamples.learningPlanDraftDetail,
    ),
    ...commonErrorResponses(["401", "404", "500"], {
      "404": {
        description: "草稿不存在，或不属于当前用户。",
        example: {
          code: "PLAN_DRAFT_NOT_FOUND",
          message: "当前学习计划草稿不存在。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/plan-drafts/{id}/confirm",
  operationId: "postLearningPlanDraftConfirm",
  tags: ["learning"],
  summary: "确认学习计划草稿并替换当前进行中的自学路径",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      learningPlanDraftConfirmResponseDataSchema,
      "LearningPlanDraftConfirmResponse",
      "草稿确认成功",
      successExamples.learningPlanDraftConfirm,
    ),
    ...commonErrorResponses(["401", "404", "409", "422", "500"], {
      "404": {
        description: "草稿不存在，或不属于当前用户。",
        example: {
          code: "PLAN_DRAFT_NOT_FOUND",
          message: "当前学习计划草稿不存在。",
          data: null,
        },
      },
      "409": {
        description: "草稿已确认，或当前状态不允许再次激活。",
        example: {
          code: "PLAN_DRAFT_ALREADY_CONFIRMED",
          message: "当前学习计划草稿已确认，无需重复激活。",
          data: null,
        },
      },
      "422": {
        description: "草稿任务缺少必要的本关要掌握或注意事项，无法确认。",
        example: {
          code: "AI_RESPONSE_INVALID",
          message: "第 2 关“注意事项”至少保留 1 条后才能启用计划。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/plan-drafts/{id}/tasks/{taskId}/regenerate",
  operationId: "postLearningPlanDraftTaskRegenerate",
  tags: ["learning"],
  summary: "重生成学习计划草稿中的单个任务",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
      taskId: z.string(),
    }),
  },
  responses: {
    "200": successResponse(
      learningPlanDraftDetailResponseDataSchema,
      "LearningPlanDraftTaskRegenerateResponse",
      "任务重生成成功",
      successExamples.learningPlanDraftDetail,
    ),
    ...commonErrorResponses(["401", "404", "409", "500", "502"], {
      "404": {
        description: "草稿或任务不存在，或不属于当前用户。",
        example: {
          code: "PLAN_DRAFT_NOT_FOUND",
          message: "草稿任务不存在。",
          data: null,
        },
      },
      "409": {
        description: "草稿状态不允许重生成任务。",
        example: {
          code: "PLAN_DRAFT_ALREADY_CONFIRMED",
          message: "仅草稿状态可以重生成任务。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/learning/plan-drafts/{id}/regenerate",
  operationId: "postLearningPlanDraftRegenerate",
  tags: ["learning"],
  summary: "重新生成学习计划草稿（可选更换链接并保留原约束）",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: learningPlanDraftRegenerateRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      learningPlanFromMaterialResponseDataSchema,
      "LearningPlanDraftRegenerateResponse",
      "草稿重新生成成功",
      successExamples.learningPlanFromMaterial,
    ),
    ...commonErrorResponses(["401", "404", "422", "500", "502"], {
      "404": {
        description: "草稿不存在，或不属于当前用户。",
        example: {
          code: "PLAN_DRAFT_NOT_FOUND",
          message: "当前学习计划草稿不存在。",
          data: null,
        },
      },
      "422": {
        description: "重新生成偏好参数未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "weeklyHours 必须是 1 到 40 之间的正整数。",
          data: null,
        },
      },
      "502": {
        description: "AI 重新生成计划时返回非法结果或材料抽取失败。",
        example: {
          code: "AI_RESPONSE_INVALID",
          message: "AI 返回结果未通过校验，请补充学习目标后重试。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/task/complete",
  operationId: "postTaskComplete",
  tags: ["task"],
  summary: "完成当前任务",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: completeTaskRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      completeTaskResponseDataSchema,
      "TaskCompleteResponse",
      "任务完成成功",
      successExamples.taskComplete,
    ),
    ...commonErrorResponses(["400", "401", "404", "422", "500"], {
      "400": {
        description: "任务存在，但当前学习路径状态不允许完成该任务。",
        example: {
          code: "VALIDATION_FAILED",
          message: "只能完成当前正在进行的关卡",
          data: null,
        },
      },
      "422": {
        description: "请求字段通过了解析，但 `taskId` 未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "taskId 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/task/update-status",
  operationId: "postTaskUpdateStatus",
  tags: ["task"],
  summary: "更新当前任务状态",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateTaskStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      updateTaskStatusResponseDataSchema,
      "TaskUpdateStatusResponse",
      "任务状态更新成功",
      successExamples.taskUpdateStatus,
    ),
    ...commonErrorResponses(["400", "401", "404", "422", "500"], {
      "400": {
        description: "任务存在，但当前学习路径状态不允许更新该任务状态。",
        example: {
          code: "VALIDATION_FAILED",
          message: "只能更新当前正在进行的关卡状态",
          data: null,
        },
      },
      "422": {
        description: "请求字段通过了解析，但 `taskId` 或 `status` 未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "taskId 或 status 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/checkin/daily",
  operationId: "postCheckinDaily",
  tags: ["achievement"],
  summary: "执行每日打卡",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      checkinDailyResponseDataSchema,
      "CheckinDailyResponse",
      "打卡成功",
      successExamples.checkinDaily,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/progress/current",
  operationId: "getProgressCurrent",
  tags: ["progress"],
  summary: "获取当前学习进度摘要",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      progressCurrentResponseDataSchema,
      "ProgressCurrentResponse",
      "当前进度读取成功",
      successExamples.progressCurrent,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/progress/map",
  operationId: "getProgressMap",
  tags: ["progress"],
  summary: "获取路径地图",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      progressMapResponseDataSchema,
      "ProgressMapResponse",
      "路径地图读取成功",
      successExamples.progressMap,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/achievement/summary",
  operationId: "getAchievementSummary",
  tags: ["achievement"],
  summary: "获取成长与成就汇总",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      achievementSummaryResponseDataSchema,
      "AchievementSummaryResponse",
      "成就汇总读取成功",
      successExamples.achievementSummary,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/history/recent",
  operationId: "getHistoryRecent",
  tags: ["history"],
  summary: "分页获取学习计划历史",
  security: [{ bearerAuth: [] }],
  request: {
    query: historyRecentQuerySchema,
  },
  responses: {
    "200": successResponse(
      learningHistoryResponseDataSchema,
      "LearningHistoryResponse",
      "学习历史读取成功",
      successExamples.historyRecent,
    ),
    ...commonErrorResponses(["401", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/history/{id}",
  operationId: "getHistoryDetail",
  tags: ["history"],
  summary: "获取单条学习计划详情",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      learningHistoryDetailResponseDataSchema,
      "LearningHistoryDetailResponse",
      "学习计划详情读取成功",
      successExamples.historyDetail,
    ),
    ...commonErrorResponses(["400", "401", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/history/{id}/status",
  operationId: "postHistoryStatus",
  tags: ["history"],
  summary: "更新学习计划状态",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateLearningHistoryStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      updateLearningHistoryStatusResponseDataSchema,
      "UpdateLearningHistoryStatusResponse",
      "学习计划状态更新成功",
      successExamples.historyStatus,
      "history plan updated",
    ),
    ...commonErrorResponses(["400", "401", "404", "409", "500"], {
      "400": {
        description: "请求体或当前学习计划状态不允许执行该操作。",
        example: {
          code: "VALIDATION_FAILED",
          message: "只有进行中的学习计划才能执行该操作",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/analytics/event",
  operationId: "postAnalyticsEvent",
  tags: ["analytics"],
  summary: "写入前端业务事件",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: analyticsTrackEventRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      analyticsTrackEventResponseDataSchema,
      "AnalyticsTrackEventResponse",
      "事件写入成功",
      successExamples.analyticsTrackEvent,
    ),
    ...commonErrorResponses(["400", "500"], {
      "400": {
        description: "eventName、pagePath、properties 或 occurredAt 未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "eventName 不合法。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/notifications/settings",
  operationId: "getNotificationSettings",
  tags: ["notifications"],
  summary: "获取当前用户通知设置",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      notificationSettingsDataSchema,
      "NotificationSettingsResponse",
      "通知设置读取成功",
      successExamples.notificationSettings,
    ),
    ...commonErrorResponses(["401", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/notifications/settings",
  operationId: "patchNotificationSettings",
  tags: ["notifications"],
  summary: "更新当前用户通知设置",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: notificationSettingsDataSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      notificationSettingsDataSchema,
      "NotificationSettingsPatchResponse",
      "通知设置更新成功",
      successExamples.notificationSettings,
      "notification settings updated",
    ),
    ...commonErrorResponses(["400", "401", "500"], {
      "400": {
        description: "通知设置字段未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "checkinTime 必须是 HH:mm 格式。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/notifications/in-app",
  operationId: "getInAppNotifications",
  tags: ["notifications"],
  summary: "获取当前用户站内提醒列表",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      notificationInAppListResponseDataSchema,
      "NotificationInAppListResponse",
      "站内提醒读取成功",
      successExamples.notificationList,
    ),
    ...commonErrorResponses(["401", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/notifications/{id}/read",
  operationId: "postNotificationRead",
  tags: ["notifications"],
  summary: "标记站内提醒为已读",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      notificationMutationResponseDataSchema,
      "NotificationReadResponse",
      "提醒状态已更新",
      successExamples.notificationMutation,
      "notification read",
    ),
    ...commonErrorResponses(["400", "401", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/notifications/{id}/dismiss",
  operationId: "postNotificationDismiss",
  tags: ["notifications"],
  summary: "忽略一条站内提醒",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      notificationMutationResponseDataSchema,
      "NotificationDismissResponse",
      "提醒已忽略",
      {
        ...successExamples.notificationMutation,
        status: "dismissed",
        dismissedAt: EXAMPLE_LATER,
      },
      "notification dismissed",
    ),
    ...commonErrorResponses(["400", "401", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/feedback",
  operationId: "postFeedback",
  tags: ["feedback"],
  summary: "提交用户反馈",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createFeedbackRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      createFeedbackResponseDataSchema,
      "CreateFeedbackResponse",
      "反馈提交成功",
      successExamples.feedbackCreate,
      "feedback created",
    ),
    ...commonErrorResponses(["400", "401", "500"], {
      "400": {
        description: "反馈类型、标题、内容或联系方式未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "标题至少需要 4 个字符。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/feedback/mine",
  operationId: "getFeedbackMine",
  tags: ["feedback"],
  summary: "获取当前用户反馈列表",
  security: [{ bearerAuth: [] }],
  responses: {
    "200": successResponse(
      feedbackMineListResponseDataSchema,
      "FeedbackMineListResponse",
      "反馈列表读取成功",
      successExamples.feedbackMineList,
    ),
    ...commonErrorResponses(["401", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/feedback/mine/{id}",
  operationId: "getFeedbackMineDetail",
  tags: ["feedback"],
  summary: "获取当前用户单条反馈详情",
  security: [{ bearerAuth: [] }],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      feedbackTicketDetailSchema,
      "FeedbackTicketDetailResponse",
      "反馈详情读取成功",
      successExamples.feedbackDetail,
    ),
    ...commonErrorResponses(["400", "401", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/profile/me",
  operationId: "getAdminProfileMe",
  tags: ["admin-profile"],
  summary: "获取管理员个人资料",
  security: [],
  responses: {
    "200": successResponse(
      profileMeResponseDataSchema,
      "AdminProfileMeResponse",
      "档案读取成功",
      successExamples.profileMe,
    ),
    ...commonErrorResponses(["401", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/profile/me",
  operationId: "patchAdminProfileMe",
  tags: ["admin-profile"],
  summary: "更新管理员个人资料",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateProfileMeRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      profileMeResponseDataSchema,
      "AdminProfileMeUpdateResponse",
      "档案更新成功",
      successExamples.profileMe,
      "profile updated",
    ),
    ...commonErrorResponses(["400", "401", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/profile/avatar",
  operationId: "postAdminProfileAvatar",
  tags: ["admin-profile"],
  summary: "上传管理员头像",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: uploadProfileAvatarRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      uploadProfileAvatarResponseDataSchema,
      "AdminUploadProfileAvatarResponse",
      "头像上传成功",
      successExamples.profileAvatar,
      "avatar uploaded",
    ),
    ...commonErrorResponses(["400", "401", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/auth/login",
  operationId: "postAdminLogin",
  tags: ["admin-auth"],
  summary: "管理员登录",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminLoginRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminSessionResponseDataSchema,
      "AdminLoginResponse",
      "管理员登录成功",
      successExamples.adminSession,
      "登录成功",
    ),
    ...commonErrorResponses(["400", "401", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/auth/session",
  operationId: "getAdminSession",
  tags: ["admin-auth"],
  summary: "获取当前管理员会话",
  security: [],
  responses: {
    "200": successResponse(
      adminSessionResponseDataSchema,
      "AdminSessionResponse",
      "获取会话成功",
      successExamples.adminSession,
      "获取会话成功",
    ),
    ...commonErrorResponses(["403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/auth/logout",
  operationId: "postAdminLogout",
  tags: ["admin-auth"],
  summary: "管理员登出",
  security: [],
  responses: {
    "200": successResponse(
      z.object({ success: z.literal(true) }).openapi("AdminLogoutOkData"),
      "AdminLogoutOkData",
      "管理员登出成功",
      { success: true },
      "登出成功",
    ),
    ...commonErrorResponses(["500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/dashboard/overview",
  operationId: "getAdminDashboardOverview",
  tags: ["admin-dashboard"],
  summary: "获取管理员总览看板数据",
  security: [],
  responses: {
    "200": successResponse(
      adminDashboardOverviewResponseDataSchema,
      "AdminDashboardOverviewResponse",
      "获取看板数据成功",
      successExamples.adminDashboardOverview,
      "获取看板数据成功",
    ),
    ...commonErrorResponses(["403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/auth/change-password",
  operationId: "postAdminChangePassword",
  tags: ["admin-auth"],
  summary: "管理员修改登录密码",
  description: "需携带管理后台登录 Cookie。成功后清除会话 Cookie，应重新登录。",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminChangePasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      z.object({ success: z.literal(true) }).openapi("AdminChangePasswordOkData"),
      "AdminChangePasswordOkData",
      "密码已更新，请使用新密码重新登录",
      { success: true },
      "密码已更新，请使用新密码重新登录",
    ),
    ...commonErrorResponses(["400", "401", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/feedback",
  operationId: "getAdminFeedbackList",
  tags: ["admin-feedback"],
  summary: "获取管理员反馈列表",
  security: [],
  request: {
    query: adminFeedbackListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminFeedbackListResponseDataSchema,
      "AdminFeedbackListResponse",
      "管理员反馈列表读取成功",
      successExamples.adminFeedbackList,
    ),
    ...commonErrorResponses(["400", "403", "500"], {
      "400": {
        description: "管理员筛选参数未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "limit 必须在 1 到 100 之间。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/feedback/batch-delete",
  operationId: "postAdminFeedbackBatchDelete",
  tags: ["admin-feedback"],
  summary: "批量删除反馈工单",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminFeedbackBatchDeleteRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminFeedbackBatchDeleteResponseDataSchema,
      "AdminFeedbackBatchDeleteResponse",
      "反馈工单批量删除成功",
      adminFeedbackBatchDeleteExample,
      "feedback batch deleted",
    ),
    ...commonErrorResponses(["400", "403", "500"], {
      "400": {
        description: "批量删除请求体格式不正确，或 ids 未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "至少选择 1 条工单。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/feedback/{id}",
  operationId: "getAdminFeedbackDetail",
  tags: ["admin-feedback"],
  summary: "获取管理员反馈详情",
  security: [],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminFeedbackTicketDetailResponseDataSchema,
      "AdminFeedbackDetailResponse",
      "管理员反馈详情读取成功",
      successExamples.adminFeedbackDetail,
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/feedback/{id}/user-snapshot",
  operationId: "getAdminFeedbackUserSnapshot",
  tags: ["admin-feedback"],
  summary: "获取反馈关联用户快照",
  security: [],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminFeedbackUserSnapshotResponseDataSchema,
      "AdminFeedbackUserSnapshotResponse",
      "反馈关联用户快照读取成功",
      adminFeedbackUserSnapshotExample,
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "delete",
  path: "/api/admin/feedback/{id}",
  operationId: "deleteAdminFeedback",
  tags: ["admin-feedback"],
  summary: "删除反馈工单",
  security: [],
  request: {
    params: routeIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminFeedbackDeleteOkDataSchema,
      "AdminFeedbackDeleteResponse",
      "反馈工单已删除",
      { deleted: true },
      "feedback deleted",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/feedback/{id}/reply",
  operationId: "postAdminFeedbackReply",
  tags: ["admin-feedback"],
  summary: "管理员回复反馈",
  security: [],
  request: {
    params: routeIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminReplyFeedbackRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminFeedbackTicketDetailResponseDataSchema,
      "AdminReplyFeedbackResponse",
      "管理员回复成功",
      successExamples.adminFeedbackDetail,
      "feedback replied",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"], {
      "400": {
        description: "管理员回复内容或状态字段未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "回复内容至少需要 2 个字符。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/feedback/{id}/status",
  operationId: "postAdminFeedbackStatus",
  tags: ["admin-feedback"],
  summary: "管理员更新反馈状态",
  security: [],
  request: {
    params: routeIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminUpdateFeedbackStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminFeedbackTicketDetailResponseDataSchema,
      "AdminUpdateFeedbackStatusResponse",
      "管理员状态更新成功",
      successExamples.adminFeedbackDetail,
      "feedback status updated",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"], {
      "400": {
        description: "管理员状态更新请求体格式不正确，或状态值未通过校验。",
        example: {
          code: "BAD_REQUEST",
          message: ROUTE_ERROR_MESSAGES.invalidAdminStatusBody,
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  operationId: "getAdminUserList",
  tags: ["admin-users"],
  summary: "管理端用户列表（需管理端 Cookie）",
  description: "基于 user_profile_export_view；accountStatus 默认 active。",
  security: [],
  request: {
    query: adminUserListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminUserListResponseDataSchema,
      "AdminUserListResponse",
      "用户列表读取成功",
      successExamples.adminUserList,
      "用户列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"], {
      "400": {
        description: "列表筛选参数未通过校验。",
        example: {
          code: "VALIDATION_FAILED",
          message: "limit 必须在 1 到 100 之间。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/users/export",
  operationId: "getAdminUsersExport",
  tags: ["admin-users"],
  summary: "导出用户 CSV（与列表相同筛选，最多 10000 行）",
  security: [],
  request: {
    query: adminUserListQuerySchema,
  },
  responses: {
    "200": {
      description: "UTF-8 CSV（含 BOM），Content-Disposition 为附件。",
      content: {
        "text/csv": {
          schema: z.string(),
          example: "用户ID,昵称\n550e8400-e29b-41d4-a716-446655440001,Bao",
        },
      },
    },
    ...commonErrorResponses(["400", "403", "413", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/users/{userId}",
  operationId: "getAdminUserDetail",
  tags: ["admin-users"],
  summary: "管理端用户详情",
  security: [],
  request: {
    params: adminUserIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminUserExportViewDataSchema,
      "AdminUserDetailResponse",
      "用户详情读取成功",
      successExamples.adminUserExportRow,
      "用户详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/users/{userId}",
  operationId: "patchAdminUser",
  tags: ["admin-users"],
  summary: "管理端更新用户资料（白名单字段）",
  security: [],
  request: {
    params: adminUserIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminUpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminUserExportViewDataSchema,
      "AdminUserPatchResponse",
      "用户资料已更新",
      successExamples.adminUserExportRow,
      "用户资料已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{userId}/soft-delete",
  operationId: "postAdminUserSoftDelete",
  tags: ["admin-users"],
  summary: "软删除用户（幂等）",
  security: [],
  request: {
    params: adminUserIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: adminSoftDeleteUserRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminUserExportViewDataSchema,
      "AdminUserSoftDeleteResponse",
      "用户已软删除",
      successExamples.adminUserExportRow,
      "用户已软删除",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"], {
      "409": {
        description: "管理员关联用户不允许软删除。",
        example: {
          code: "CONFLICT",
          message: "管理员关联的用户档案不允许软删除。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/users/{userId}/restore",
  operationId: "postAdminUserRestore",
  tags: ["admin-users"],
  summary: "恢复已软删除用户",
  security: [],
  request: {
    params: adminUserIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminUserExportViewDataSchema,
      "AdminUserRestoreResponse",
      "用户已恢复",
      successExamples.adminUserExportRow,
      "用户已恢复",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"], {
      "409": {
        description: "用户未处于软删除状态。",
        example: {
          code: "USER_NOT_SOFT_DELETED",
          message: "该用户未处于软删除状态，无需恢复。",
          data: null,
        },
      },
    }),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/learning-paths",
  operationId: "getAdminLearningPathList",
  tags: ["admin-learning"],
  summary: "管理端学习路径列表",
  description: "基于真实 user_learning_paths 聚合用户、任务、工具与状态摘要。",
  security: [],
  request: {
    query: adminLearningPathListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminLearningPathListResponseDataSchema,
      "AdminLearningPathListResponse",
      "学习计划列表读取成功",
      successExamples.adminLearningPathList,
      "学习计划列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/learning-paths/export",
  operationId: "getAdminLearningPathExport",
  tags: ["admin-learning"],
  summary: "导出学习路径 CSV（最多 10000 行）",
  security: [],
  request: {
    query: adminLearningPathListQuerySchema,
  },
  responses: {
    "200": {
      description: "UTF-8 CSV（含 BOM），Content-Disposition 为附件。",
      content: {
        "text/csv": {
          schema: z.string(),
          example: "路径ID,用户ID,计划名称\n550e8400-e29b-41d4-a716-446655440100,550e8400-e29b-41d4-a716-446655440001,Cursor 入门训练营",
        },
      },
    },
    ...commonErrorResponses(["400", "403", "413", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/learning-paths/{pathId}",
  operationId: "getAdminLearningPathDetail",
  tags: ["admin-learning"],
  summary: "管理端学习路径详情",
  security: [],
  request: {
    params: adminLearningPathIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminLearningPathDetailResponseDataSchema,
      "AdminLearningPathDetailResponse",
      "学习路径详情读取成功",
      successExamples.adminLearningPathDetail,
      "学习路径详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/learning-paths/{pathId}/status",
  operationId: "postAdminLearningPathStatus",
  tags: ["admin-learning"],
  summary: "管理端更新学习路径状态",
  security: [],
  request: {
    params: adminLearningPathIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminUpdateLearningPathStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminUpdateLearningPathStatusResponseDataSchema,
      "AdminLearningPathStatusResponse",
      "学习路径状态已更新",
      successExamples.adminLearningPathStatusUpdate,
      "学习路径状态已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/settings/overview",
  operationId: "getAdminSettingsOverview",
  tags: ["admin-settings"],
  summary: "系统设置概览",
  security: [],
  responses: {
    "200": successResponse(
      adminSettingsOverviewResponseDataSchema,
      "AdminSettingsOverviewResponse",
      "系统设置概览读取成功",
      successExamples.adminSettingsOverview,
      "系统设置概览读取成功",
    ),
    ...commonErrorResponses(["403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/settings/admin-accounts",
  operationId: "getAdminSettingsAdminAccountList",
  tags: ["admin-settings"],
  summary: "管理员账号列表",
  security: [],
  request: {
    query: adminSettingsAdminAccountListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminSettingsAdminAccountListResponseDataSchema,
      "AdminSettingsAdminAccountListResponse",
      "管理员账号列表读取成功",
      successExamples.adminSettingsAccountList,
      "管理员账号列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/settings/admin-accounts/{adminAccountId}/status",
  operationId: "postAdminSettingsAdminAccountStatus",
  tags: ["admin-settings"],
  summary: "启用或停用管理员账号",
  security: [],
  request: {
    params: adminSettingsAdminAccountIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminUpdateAdminAccountStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminUpdateAdminAccountStatusResponseDataSchema,
      "AdminSettingsAdminAccountStatusResponse",
      "管理员账号状态已更新",
      successExamples.adminSettingsAccountStatusUpdate,
      "管理员账号状态已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/settings/audit-logs",
  operationId: "getAdminSettingsAuditLogList",
  tags: ["admin-settings"],
  summary: "系统设置操作审计列表",
  security: [],
  request: {
    query: adminSettingsAuditLogListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminSettingsAuditLogListResponseDataSchema,
      "AdminSettingsAuditLogListResponse",
      "操作审计列表读取成功",
      successExamples.adminSettingsAuditLogList,
      "操作审计列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/overview",
  operationId: "getAdminAIOverview",
  tags: ["admin-ai"],
  summary: "AI 运营概览",
  security: [],
  responses: {
    "200": successResponse(
      adminAIOverviewResponseDataSchema,
      "AdminAIOverviewResponse",
      "AI 运营概览读取成功",
      successExamples.adminAIOverview,
      "AI 运营概览读取成功",
    ),
    ...commonErrorResponses(["403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/providers",
  operationId: "getAdminAIProviderList",
  tags: ["admin-ai"],
  summary: "Provider 列表",
  security: [],
  request: {
    query: adminAIListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIProviderListResponseDataSchema,
      "AdminAIProviderListResponse",
      "Provider 列表读取成功",
      successExamples.adminAIProviderList,
      "Provider 列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/providers",
  operationId: "postAdminAIProvider",
  tags: ["admin-ai"],
  summary: "创建 Provider",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIProviderUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIProviderDetailResponseDataSchema,
      "AdminAIProviderCreateResponse",
      "Provider 创建成功",
      successExamples.adminAIProviderDetail,
      "Provider 创建成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/providers/{providerId}",
  operationId: "getAdminAIProviderDetail",
  tags: ["admin-ai"],
  summary: "Provider 详情",
  security: [],
  request: {
    params: adminAIProviderIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminAIProviderDetailResponseDataSchema,
      "AdminAIProviderDetailResponse",
      "Provider 详情读取成功",
      successExamples.adminAIProviderDetail,
      "Provider 详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/providers/{providerId}",
  operationId: "patchAdminAIProvider",
  tags: ["admin-ai"],
  summary: "更新 Provider",
  security: [],
  request: {
    params: adminAIProviderIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIProviderUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIProviderDetailResponseDataSchema,
      "AdminAIProviderPatchResponse",
      "Provider 已更新",
      successExamples.adminAIProviderDetail,
      "Provider 已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/providers/{providerId}/reveal-secret",
  operationId: "postAdminAIProviderRevealSecret",
  tags: ["admin-ai"],
  summary: "按需读取 Provider API Key 明文",
  security: [],
  request: {
    params: adminAIProviderIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminAIProviderSecretRevealResponseDataSchema,
      "AdminAIProviderSecretRevealResponse",
      "Provider 密钥读取成功",
      successExamples.adminAIProviderSecretReveal,
      "Provider 密钥读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/providers/{providerId}/test-connection",
  operationId: "postAdminAIProviderTestConnection",
  tags: ["admin-ai"],
  summary: "测试 Provider 连接（Base URL + API Key）",
  description:
    "在未保存表单前，使用当前表单中的 Base URL、鉴权方式、Provider 类型与密钥（新 API Key 优先，否则按库内/环境变量解析）发起轻量 GET /models 探测。",
  security: [],
  request: {
    params: adminAIProviderIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIProviderTestConnectionRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIProviderTestConnectionResponseDataSchema,
      "AdminAIProviderTestConnectionResponse",
      "Provider 连接测试完成",
      successExamples.adminAIProviderTestConnectionOk,
      "探测完成；success 为 false 时表示上游拒绝或网络异常。",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/models",
  operationId: "getAdminAIModelList",
  tags: ["admin-ai"],
  summary: "Model 列表（可选 query.modelId 读取单条详情）",
  security: [],
  request: {
    query: adminAIListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIModelListResponseDataSchema,
      "AdminAIModelListResponse",
      "Model 列表读取成功",
      successExamples.adminAIModelList,
      "Model 列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/models",
  operationId: "postAdminAIModel",
  tags: ["admin-ai"],
  summary: "创建 Model",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIModelUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIModelDetailResponseDataSchema,
      "AdminAIModelCreateResponse",
      "Model 创建成功",
      successExamples.adminAIModelDetail,
      "Model 创建成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/models",
  operationId: "patchAdminAIModelByQuery",
  tags: ["admin-ai"],
  summary: "更新 Model（query.modelId 指定目标，与 PATCH /models/{modelId} 等价）",
  security: [],
  request: {
    query: z
      .object({
        modelId: z.string().min(1),
      })
      .openapi("AdminAIModelPatchByQuery"),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIModelUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIModelDetailResponseDataSchema,
      "AdminAIModelPatchByQueryResponse",
      "Model 已更新",
      successExamples.adminAIModelDetail,
      "Model 已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/models/{modelId}",
  operationId: "getAdminAIModelDetail",
  tags: ["admin-ai"],
  summary: "Model 详情",
  security: [],
  request: {
    params: adminAIModelIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminAIModelDetailResponseDataSchema,
      "AdminAIModelDetailResponse",
      "Model 详情读取成功",
      successExamples.adminAIModelDetail,
      "Model 详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/models/{modelId}",
  operationId: "patchAdminAIModel",
  tags: ["admin-ai"],
  summary: "更新 Model",
  security: [],
  request: {
    params: adminAIModelIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIModelUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIModelDetailResponseDataSchema,
      "AdminAIModelPatchResponse",
      "Model 已更新",
      successExamples.adminAIModelDetail,
      "Model 已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/models/{modelId}/test-connection",
  operationId: "postAdminAIModelTestConnection",
  tags: ["admin-ai"],
  summary: "测试 Model 连接（Provider 密钥 + 真实模型名）",
  description:
    "使用库内所选 Provider 的 Base URL 与已配置密钥，对表单中的「真实模型名」发起轻量探测。默认使用最小 chat 请求；若模型 metadata 含 `quality_check` 能力，或为 `enableThinking=true` / reasoning profile，则退化为 `/models` 级鉴权连通性探测。仅支持 OpenAI 兼容与 SiliconFlow Provider。",
  security: [],
  request: {
    params: adminAIModelIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIModelTestConnectionRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIModelTestConnectionResponseDataSchema,
      "AdminAIModelTestConnectionResponse",
      "Model 连接测试完成",
      successExamples.adminAIModelTestConnectionOk,
      "探测完成；success 为 false 时表示上游拒绝或网络异常。",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/agents",
  operationId: "getAdminAIAgentList",
  tags: ["admin-ai"],
  summary: "Agent 列表",
  security: [],
  request: {
    query: adminAIAgentListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIAgentListResponseDataSchema,
      "AdminAIAgentListResponse",
      "Agent 列表读取成功",
      successExamples.adminAIAgentList,
      "Agent 列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/agents",
  operationId: "postAdminAIAgent",
  tags: ["admin-ai"],
  summary: "创建 Agent",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentDetailResponseDataSchema,
      "AdminAIAgentCreateResponse",
      "Agent 创建成功",
      successExamples.adminAIAgentDetail,
      "Agent 创建成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/agents/{agentId}",
  operationId: "getAdminAIAgentDetail",
  tags: ["admin-ai"],
  summary: "Agent 详情",
  security: [],
  request: {
    params: adminAIAgentIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminAIAgentDetailResponseDataSchema,
      "AdminAIAgentDetailResponse",
      "Agent 详情读取成功",
      successExamples.adminAIAgentDetail,
      "Agent 详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/agents/{agentId}",
  operationId: "patchAdminAIAgent",
  tags: ["admin-ai"],
  summary: "更新 Agent",
  security: [],
  request: {
    params: adminAIAgentIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentDetailResponseDataSchema,
      "AdminAIAgentPatchResponse",
      "Agent 已更新",
      successExamples.adminAIAgentDetail,
      "Agent 已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/agent-bindings",
  operationId: "getAdminAIAgentBindingList",
  tags: ["admin-ai"],
  summary: "Agent 命中规则列表",
  security: [],
  request: {
    query: adminAIQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIAgentBindingListResponseDataSchema,
      "AdminAIAgentBindingListResponse",
      "Agent 命中规则列表读取成功",
      successExamples.adminAIAgentBindingList,
      "Agent 命中规则列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/agent-bindings",
  operationId: "postAdminAIAgentBinding",
  tags: ["admin-ai"],
  summary: "创建 Agent 命中规则",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentBindingUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentBindingListItemSchema,
      "AdminAIAgentBindingCreateResponse",
      "Agent 命中规则创建成功",
      successExamples.adminAIAgentBindingList.items[0],
      "Agent 命中规则创建成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/agent-bindings/{bindingId}",
  operationId: "patchAdminAIAgentBinding",
  tags: ["admin-ai"],
  summary: "更新 Agent 命中规则",
  security: [],
  request: {
    params: adminAIBindingIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentBindingUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentBindingListItemSchema,
      "AdminAIAgentBindingPatchResponse",
      "命中规则已更新",
      successExamples.adminAIAgentBindingList.items[0],
      "命中规则已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/skills",
  operationId: "getAdminAISkillList",
  tags: ["admin-ai"],
  summary: "Skill 列表",
  security: [],
  request: {
    query: adminAIQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAISkillListResponseDataSchema,
      "AdminAISkillListResponse",
      "Skill 列表读取成功",
      successExamples.adminAISkillList,
      "Skill 列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/agent-skill-bindings",
  operationId: "getAdminAIAgentSkillBindingList",
  tags: ["admin-ai"],
  summary: "Agent Skill 绑定列表",
  security: [],
  request: {
    query: adminAIQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIAgentSkillBindingListResponseDataSchema,
      "AdminAIAgentSkillBindingListResponse",
      "Agent Skill 绑定列表读取成功",
      successExamples.adminAIAgentSkillBindingList,
      "Agent Skill 绑定列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/agent-skill-bindings",
  operationId: "postAdminAIAgentSkillBinding",
  tags: ["admin-ai"],
  summary: "创建 Agent Skill 绑定",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentSkillBindingUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentSkillBindingListItemSchema,
      "AdminAIAgentSkillBindingCreateResponse",
      "Agent Skill 绑定创建成功",
      successExamples.adminAIAgentSkillBindingList.items[0],
      "Agent Skill 绑定创建成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "patch",
  path: "/api/admin/ai/agent-skill-bindings/{bindingId}",
  operationId: "patchAdminAIAgentSkillBinding",
  tags: ["admin-ai"],
  summary: "更新 Agent Skill 绑定",
  security: [],
  request: {
    params: adminAIBindingIdParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIAgentSkillBindingUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIAgentSkillBindingListItemSchema,
      "AdminAIAgentSkillBindingPatchResponse",
      "Skill 绑定已更新",
      successExamples.adminAIAgentSkillBindingList.items[0],
      "Skill 绑定已更新",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/invocations",
  operationId: "getAdminAIInvocationList",
  tags: ["admin-ai"],
  summary: "调用日志列表",
  security: [],
  request: {
    query: adminAIInvocationListQuerySchema,
  },
  responses: {
    "200": successResponse(
      adminAIInvocationListResponseDataSchema,
      "AdminAIInvocationListResponse",
      "调用日志列表读取成功",
      successExamples.adminAIInvocationList,
      "调用日志列表读取成功",
    ),
    ...commonErrorResponses(["400", "403", "500"]),
  },
})

registry.registerPath({
  method: "get",
  path: "/api/admin/ai/invocations/{invocationId}",
  operationId: "getAdminAIInvocationDetail",
  tags: ["admin-ai"],
  summary: "调用日志详情",
  security: [],
  request: {
    params: adminAIInvocationIdParamsSchema,
  },
  responses: {
    "200": successResponse(
      adminAIInvocationDetailResponseDataSchema,
      "AdminAIInvocationDetailResponse",
      "调用日志详情读取成功",
      successExamples.adminAIInvocationDetail,
      "调用日志详情读取成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/resolve-preview",
  operationId: "postAdminAIResolvePreview",
  tags: ["admin-ai"],
  summary: "命中预览",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAIResolvePreviewRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAIResolvePreviewResponseDataSchema,
      "AdminAIResolvePreviewResponse",
      "命中预览成功",
      successExamples.adminAIResolvePreview,
      "命中预览成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

registry.registerPath({
  method: "post",
  path: "/api/admin/ai/agent/test",
  operationId: "postAdminAITest",
  tags: ["admin-ai"],
  summary: "执行 AI 测试",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminAITestRequestSchema,
        },
      },
    },
  },
  responses: {
    "200": successResponse(
      adminAITestResponseDataSchema,
      "AdminAITestResponse",
      "AI 测试执行成功",
      successExamples.adminAITest,
      "AI 测试执行成功",
    ),
    ...commonErrorResponses(["400", "403", "404", "409", "500"]),
  },
})

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "AI编程学习教练 API",
      version: "1.0.0",
      description:
        "当前仓库已实现后端 API 的自动生成 OpenAPI 文档。\n\n用户端明暗主题偏好仅保存在浏览器 localStorage（next-themes），不提供与之对应的 REST 接口。",
    },
    servers: [
      {
        url: "/",
      },
    ],
  })
}
