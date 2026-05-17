import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"
import { z } from "zod"
import { FEEDBACK_PRIORITIES, FEEDBACK_REPLY_AUTHOR_TYPES, FEEDBACK_STATUSES, FEEDBACK_SOURCES, FEEDBACK_TYPES } from "@/lib/api/contracts/feedback"
import { ADMIN_ACCOUNT_STATUSES, ADMIN_AUDIT_ACTIONS, ADMIN_ROLE_CODES } from "@/lib/api/contracts/admin"
import {
  ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES,
  ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS,
  ADMIN_SETTINGS_AUDIT_TARGET_TYPES,
} from "@/lib/api/contracts/admin-settings"
import {
  ADMIN_AI_ACTIVE_STATUS_OPTIONS,
  ADMIN_AI_AGENT_SCENARIO_TYPES,
  ADMIN_AI_AUTH_MODES,
  ADMIN_AI_INVOCATION_DATE_RANGES,
  ADMIN_AI_INVOCATION_STATUSES,
  ADMIN_AI_INVOCATION_STATUS_OPTIONS,
  ADMIN_AI_MEDIA_ATTACHMENT_KINDS,
  ADMIN_AI_MEDIA_TRANSCRIPTION_TYPES,
  ADMIN_AI_MODEL_CONNECTION_TEST_MODES,
  ADMIN_AI_MODEL_FAMILIES,
  ADMIN_AI_MODEL_RUNTIME_CAPABILITIES,
  ADMIN_AI_PROVIDER_TYPES,
  ADMIN_AI_SKILL_SOURCE_TYPES,
  ADMIN_AI_SKILL_TRUST_LEVELS,
} from "@/lib/api/contracts/admin-ai"
import {
  USER_NOTIFICATION_STATUSES,
  USER_NOTIFICATION_TYPES,
} from "@/lib/api/contracts/notifications"
import {
  PAYMENT_ORDER_STATUSES,
} from "@/lib/api/contracts/payment"

extendZodWithOpenApi(z)

export const ApiErrorCodeSchema = z
  .enum([
    "BAD_REQUEST",
    "AUTH_REQUIRED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "VALIDATION_FAILED",
    "AI_PROVIDER_ERROR",
    "PAYMENT_CONFIG_INCOMPLETE",
    "PAYMENT_PROVIDER_ERROR",
    "MATERIAL_UNSUPPORTED_SOURCE",
    "MATERIAL_FETCH_FAILED",
    "MATERIAL_INSUFFICIENT_CONTENT",
    "MATERIAL_INTAKE_NOT_FOUND",
    "PLAN_DRAFT_NOT_FOUND",
    "PLAN_DRAFT_ALREADY_CONFIRMED",
    "AI_RESPONSE_INVALID",
    "RATE_LIMITED",
    "INTERNAL_ERROR",
  ])
  .openapi("ApiErrorCode")

export const ApiErrorResponseSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    data: z.null(),
  })
  .openapi("ApiErrorResponse")

export function createApiSuccessResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  name: string,
) {
  return z
    .object({
      code: z.literal("OK"),
      message: z.string(),
      data: dataSchema,
    })
    .openapi(name)
}

export const paginationPositiveIntSchema = z.number().int().positive()
export const nonEmptyStringSchema = z.string().trim().min(1)
export const nullableStringSchema = z.string().nullable()

export const routeIdParamsSchema = z
  .object({
    id: nonEmptyStringSchema,
  })
  .openapi("RouteIdParams")

export const adminOptionalHeadersSchema = z
  .object({
    "x-admin-id": z.string().optional(),
  })
  .openapi("AdminOptionalHeaders")

export const authLoginRequestSchema = z
  .object({
    loginType: z.enum(["phone", "wechat", "douyin"]),
    authCode: z.string().optional(),
  })
  .openapi("AuthLoginRequest")

export const authLoginResponseDataSchema = z
  .object({
    userId: z.string(),
    isNewUser: z.boolean(),
    onboardingCompleted: z.boolean(),
    profileCompleted: z.boolean(),
    redirectTo: z.string(),
  })
  .openapi("AuthLoginResponseData")

export const authOAuthTempDiscardRequestSchema = z
  .object({
    provider: z.enum(["wechat", "douyin"]),
  })
  .openapi("AuthOAuthTempDiscardRequest")

export const authOAuthTempDiscardResponseDataSchema = z
  .object({
    discarded: z.boolean(),
    userId: z.string(),
    provider: z.enum(["wechat", "douyin"]),
  })
  .openapi("AuthOAuthTempDiscardResponseData")

export const authPhoneStatusQuerySchema = z
  .object({
    phone: z.string().regex(/^1[3-9]\d{9}$/),
  })
  .openapi("AuthPhoneStatusQuery")

export const authPhoneStatusResponseDataSchema = z
  .object({
    phone: z.string(),
    registered: z.boolean(),
  })
  .openapi("AuthPhoneStatusResponseData")

export const authSessionSummaryResponseDataSchema = z
  .object({
    userId: z.string(),
    redirectTo: z.string(),
    phone: nullableStringSchema,
    nickname: nullableStringSchema,
  })
  .openapi("AuthSessionSummaryResponseData")

export const profileToolSchema = z
  .object({
    code: z.string(),
    name: z.string(),
  })
  .openapi("ProfileTool")

export const profileMeResponseDataSchema = z
  .object({
    userId: z.string(),
    nickname: z.string(),
    avatarUrl: nullableStringSchema,
    phone: nullableStringSchema,
    email: nullableStringSchema,
    loginEmail: nullableStringSchema.optional(),
    contactEmail: nullableStringSchema.optional(),
    wechat: nullableStringSchema,
    bio: nullableStringSchema,
    primaryTool: profileToolSchema,
    learningLevel: z.string(),
    currentScore: z.number(),
    currentRank: z.string(),
    streakDays: z.number().int().nonnegative(),
    completedTaskCount: z.number().int().nonnegative(),
    lastLearningAt: z.string(),
  })
  .openapi("ProfileMeResponseData")

export const updateProfileMeRequestSchema = z
  .object({
    nickname: z.string(),
    avatarUrl: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    wechat: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
  })
  .openapi("UpdateProfileMeRequest")

export const uploadProfileAvatarRequestSchema = z
  .object({
    file: z.any(),
  })
  .openapi("UploadProfileAvatarRequest")

export const uploadProfileAvatarResponseDataSchema = z
  .object({
    avatarUrl: z.string(),
    storagePath: z.string(),
    previousAvatarUrl: nullableStringSchema,
  })
  .openapi("UploadProfileAvatarResponseData")

export const learningLevelSchema = z
  .enum(["beginner", "intermediate", "advanced"])
  .openapi("LearningLevel")

export const selectionModeSchema = z
  .enum(["self_directed", "preset_training"])
  .openapi("SelectionMode")

export const onboardingToolColorSchema = z
  .enum(["brand", "chart-3", "chart-5", "gold"])
  .openapi("OnboardingToolColor")

export const onboardingToolSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    difficultyLevel: learningLevelSchema,
    summary: z.string(),
    category: z.string(),
    popular: z.boolean(),
    color: onboardingToolColorSchema,
  })
  .openapi("OnboardingTool")

export const onboardingToolGroupSchema = z
  .object({
    groupCode: z.string(),
    groupName: z.string(),
    tools: z.array(onboardingToolSchema),
  })
  .openapi("OnboardingToolGroup")

export const getOnboardingToolsResponseDataSchema = z
  .object({
    groups: z.array(onboardingToolGroupSchema),
  })
  .openapi("GetOnboardingToolsResponseData")

export const getOnboardingPathOptionsQuerySchema = z
  .object({
    toolCode: z.string(),
    learningLevel: learningLevelSchema,
  })
  .openapi("GetOnboardingPathOptionsQuery")

export const onboardingSelfStudyOptionSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    sourceType: z.literal("self_directed"),
    summary: z.string(),
    preview: z.array(z.string()),
    inputTypes: z.array(z.string()),
  })
  .openapi("OnboardingSelfStudyOption")

export const onboardingPresetPathOptionSchema = z
  .object({
    pathId: z.string(),
    code: z.string(),
    name: z.string(),
    sourceType: z.literal("preset_training"),
    stageCount: z.number().int().nonnegative(),
    summary: z.string(),
    recommended: z.boolean(),
    currentLevelFit: z.string(),
    coachAgentLabel: z.string(),
    estimatedDuration: z.string(),
    tags: z.array(z.string()),
    preview: z.array(z.string()),
  })
  .openapi("OnboardingPresetPathOption")

export const getOnboardingPathOptionsResponseDataSchema = z
  .object({
    selfStudyOption: onboardingSelfStudyOptionSchema,
    presetPathOptions: z.array(onboardingPresetPathOptionSchema),
  })
  .openapi("GetOnboardingPathOptionsResponseData")

export const completeOnboardingRequestSchema = z
  .object({
    toolCode: z.string(),
    learningLevel: learningLevelSchema,
    selectionMode: selectionModeSchema,
    selectedPathId: z.string().optional(),
  })
  .openapi("CompleteOnboardingRequest")

export const completeOnboardingResponseDataSchema = z
  .object({
    onboardingCompleted: z.boolean(),
    primaryToolCode: z.string(),
    learningLevel: learningLevelSchema,
    selectionMode: selectionModeSchema,
    pathId: z.string().optional(),
    currentTaskId: z.string(),
    initialPreview: z.array(z.string()),
    redirectTo: z.string(),
  })
  .openapi("CompleteOnboardingResponseData")

export const learningTaskStateSchema = z
  .enum(["pending", "in_progress", "blocked", "completed"])
  .openapi("LearningTaskState")

export const learningInputTypeSchema = z
  .enum(["text", "link", "code"])
  .openapi("LearningInputType")

export const learningInteractionTypeSchema = z
  .enum([
    "teaching",
    "blocked_help",
    "task_review",
    "completion_feedback",
    "path_guidance",
  ])
  .openapi("LearningInteractionType")

export const learningTaskPatchStatusSchema = z
  .enum(["in_progress", "blocked", "completed"])
  .openapi("LearningTaskPatchStatus")

export const learningTaskPatchSchema = z
  .object({
    taskId: z.string(),
    status: learningTaskPatchStatusSchema,
    suggestedNextAction: z.string(),
  })
  .openapi("LearningTaskPatch")

const structuredLearningMessageBlockSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("heading"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("paragraph"),
      text: z.string(),
    }),
    z.object({
      type: z.literal("code_block"),
      language: z.string().nullable(),
      code: z.string(),
    }),
    z.object({
      type: z.literal("unordered_list"),
      items: z.array(z.string()),
    }),
    z.object({
      type: z.literal("ordered_list"),
      items: z.array(z.string()),
    }),
  ])
  .openapi("StructuredLearningMessageBlock")

const structuredLearningMessageSectionSchema = z
  .object({
    title: z.string().nullable(),
    tone: z.enum(["default", "info", "success", "warning"]),
    blocks: z.array(structuredLearningMessageBlockSchema),
  })
  .openapi("StructuredLearningMessageSection")

const structuredLearningMessageActionSchema = z
  .object({
    label: z.string(),
    prompt: z.string(),
    tone: z.enum(["primary", "secondary", "warning", "success"]),
  })
  .openapi("StructuredLearningMessageAction")

export const structuredLearningMessageContentSchema = z
  .object({
    interactionType: learningInteractionTypeSchema,
    variant: z.enum([
      "default",
      "hint",
      "example",
      "breakdown",
      "blocked_help",
      "path_guidance",
      "review",
      "completion",
    ]),
    summary: z.string().nullable(),
    blocks: z.array(structuredLearningMessageBlockSchema),
    sections: z.array(structuredLearningMessageSectionSchema),
    actions: z.array(structuredLearningMessageActionSchema),
  })
  .openapi("StructuredLearningMessageContent")

export const messageTaskPatchSchema = z
  .object({
    taskId: z.string(),
    status: learningTaskPatchStatusSchema,
    suggestedNextAction: z.string(),
  })
  .openapi("MessageTaskPatch")

export const messageAttachmentSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["image", "audio"]),
    url: z.string().optional(),
    name: z.string(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().int().positive().optional(),
    durationMs: z.number().int().nonnegative().nullable().optional(),
    processingStatus: z.enum(["pending", "processing", "completed", "failed"]).optional(),
    extractedText: z.string().nullable().optional(),
    visualSummary: z.string().nullable().optional(),
    transcriptText: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
  })
  .openapi("MessageAttachment")

export const messageSchema = z
  .object({
    id: z.number().int(),
    speechMessageId: z.string().uuid().optional(),
    role: z.enum(["system", "ai", "user"]),
    kind: z.enum(["system_goal", "coach", "user_input", "task_feedback"]),
    title: z.string().optional(),
    content: z.string(),
    structuredContent: structuredLearningMessageContentSchema.nullable().optional(),
    taskPatch: messageTaskPatchSchema.nullable().optional(),
    xp: z.number().optional(),
    nextStep: z.string().optional(),
    attachment: messageAttachmentSchema.optional(),
    attachments: z.array(messageAttachmentSchema).optional(),
  })
  .openapi("Message")

export const learningMessageAttachmentKindSchema = z
  .enum(["image", "audio"])
  .openapi("LearningMessageAttachmentKind")

export const learningMessageAttachmentProcessingStatusSchema = z
  .enum(["pending", "processing", "completed", "failed"])
  .openapi("LearningMessageAttachmentProcessingStatus")

export const learningMessageAttachmentSchema = z
  .object({
    id: z.string(),
    kind: learningMessageAttachmentKindSchema,
    processingStatus: learningMessageAttachmentProcessingStatusSchema,
    originalFilename: z.string().nullable(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
    durationMs: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    extractedText: z.string().nullable().optional(),
    visualSummary: z.string().nullable().optional(),
    transcriptText: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .openapi("LearningMessageAttachment")

export const learningAttachmentCreateResponseDataSchema = z
  .object({
    attachment: learningMessageAttachmentSchema,
  })
  .openapi("LearningAttachmentCreateResponseData")

export const learningMessageRequestSchema = z
  .object({
    conversationId: z.string().nullable().optional(),
    taskId: z.string().optional(),
    clientMessageId: z.string().optional(),
    interactionType: learningInteractionTypeSchema.optional(),
    inputType: learningInputTypeSchema,
    content: z.string(),
    attachmentIds: z.array(z.string()).optional(),
    stream: z.boolean().optional(),
    clientContext: z
      .object({
        pagePath: z.string(),
        selectionMode: selectionModeSchema.optional(),
        toolCode: z.string().optional(),
        pathCode: z.string().optional(),
        stepNo: z.number().int().positive().optional(),
        locale: z.string().optional(),
      })
      .optional(),
  })
  .openapi("LearningMessageRequest")

export const learningMessageSpeechRequestSchema = z
  .object({
    messageId: z.string().uuid(),
    text: z.string().optional(),
  })
  .openapi("LearningMessageSpeechRequest")

export const learningMessageResponseDataSchema = z
  .object({
    conversationId: z.string().nullable(),
    taskId: z.string(),
    message: messageSchema,
    taskState: learningTaskStateSchema,
    taskPatch: learningTaskPatchSchema.nullable().optional(),
  })
  .openapi("LearningMessageResponseData")

export const learningMessagesQuerySchema = z
  .object({
    conversationId: z.string(),
    beforeSequenceNo: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
  })
  .openapi("LearningMessagesQuery")

export const learningHistoryPaginationSchema = z
  .object({
    hasMore: z.boolean(),
    nextBeforeSequenceNo: z.number().int().nullable(),
  })
  .openapi("LearningHistoryPagination")

export const learningMessagesResponseDataSchema = z
  .object({
    conversationId: z.string(),
    messages: z.array(messageSchema),
    pagination: learningHistoryPaginationSchema,
  })
  .openapi("LearningMessagesResponseData")

export const learningCautionItemSchema = z
  .object({
    text: z.string(),
    isTrap: z.boolean().optional(),
  })
  .openapi("LearningCautionItem")

export const learningPlanPreviewTaskSchema = z
  .object({
    taskNo: z.number().int(),
    title: z.string(),
    objective: z.string(),
    lessonBrief: z.string(),
    practiceSteps: z.array(z.string()),
    submissionGuide: z.string(),
    checkpoints: z.array(z.string()),
    acceptanceCriteria: z.string(),
    estimatedMinutes: z.number().int().optional(),
    sourceRefs: z.array(z.string()),
    masteryPoints: z.array(z.string()).min(2),
    cautions: z.array(learningCautionItemSchema).min(1),
  })
  .openapi("LearningPlanPreviewTask")

export const learningPlanPreviewSchema = z
  .object({
    title: z.string(),
    goal: z.string(),
    tasks: z.array(learningPlanPreviewTaskSchema),
  })
  .openapi("LearningPlanPreview")

export const learningPlanFromMaterialRequestSchema = z
  .object({
    links: z.array(z.string().url()).min(1).max(5),
    userGoal: z.string().trim().optional(),
    weeklyHours: z.number().int().min(1).max(40).optional(),
    currentConstraints: z.string().trim().optional(),
  })
  .openapi("LearningPlanFromMaterialRequest")

export const materialPlanAsyncStatusSchema = z
  .enum(["queued", "extracting", "planning", "quality_checking", "ready", "failed"])
  .openapi("MaterialPlanAsyncStatus")

export const learningPlanFromMaterialResponseDataSchema = z
  .object({
    processingMode: z.literal("async"),
    intakeId: z.string().uuid(),
    runId: z.string().uuid(),
    draftId: z.string().uuid().nullable(),
    status: materialPlanAsyncStatusSchema,
  })
  .openapi("LearningPlanFromMaterialResponseData")

export const materialIntakeStatusResponseDataSchema = z
  .object({
    intakeId: z.string().uuid(),
    status: materialPlanAsyncStatusSchema,
    processingStage: z.string().nullable(),
    progressPercent: z.number().int().nullable(),
    progressMessage: z.string().nullable(),
    draftId: z.string().uuid().nullable(),
    runId: z.string().uuid().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
  })
  .openapi("MaterialIntakeStatusResponseData")

export const learningPlanDraftTaskDetailSchema = z
  .object({
    id: z.string().uuid(),
    taskNo: z.number().int(),
    position: z.number().int().nullable(),
    title: z.string(),
    objective: z.string(),
    lessonBrief: z.string(),
    practiceSteps: z.array(z.string()),
    submissionGuide: z.string(),
    checkpoints: z.array(z.string()),
    acceptanceCriteria: z.string(),
    estimatedMinutes: z.number().int().nullable(),
    sourceRefs: z.array(z.string()),
    goalAlignmentRefs: z.array(z.string()),
    masteryPoints: z.array(z.string()).min(2),
    cautions: z.array(learningCautionItemSchema).min(1),
    recommendedForWeek1: z.boolean(),
    isUserEdited: z.boolean(),
  })
  .openapi("LearningPlanDraftTaskDetail")

export const learningPlanDraftQualityCheckSchema = z
  .object({
    code: z.string(),
    passed: z.boolean(),
    message: z.string(),
  })
  .openapi("LearningPlanDraftQualityCheck")

export const learningPlanDraftQualityReportSchema = z
  .object({
    status: z.enum(["passed", "pilot_fallback"]),
    checks: z.array(learningPlanDraftQualityCheckSchema),
    warnings: z.array(z.string()),
    selfCheck: z.object({
      enabled: z.boolean(),
      decision: z.enum(["pass", "retry", "fallback", "skipped"]),
      reason: z.string().nullable(),
    }),
    fallbackReason: z.string().nullable(),
  })
  .openapi("LearningPlanDraftQualityReport")

export const learningPlanDraftDetailResponseDataSchema = z
  .object({
    draftId: z.string().uuid(),
    intakeId: z.string().uuid(),
    inputContext: z.object({
      links: z.array(z.string().url()),
      userGoal: z.string().nullable(),
      weeklyHours: z.number().int().nullable(),
      currentConstraints: z.string().nullable(),
    }),
    title: z.string(),
    goal: z.string().nullable(),
    status: z.enum(["draft", "confirmed", "rejected", "superseded"]),
    revisionNo: z.number().int(),
    qualityStatus: z.string(),
    qualityReport: learningPlanDraftQualityReportSchema.nullable(),
    alignmentTable: z.unknown(),
    week1TaskIds: z.array(z.string().uuid()),
    updatedAt: z.string(),
    tasks: z.array(learningPlanDraftTaskDetailSchema),
  })
  .openapi("LearningPlanDraftDetailResponseData")

export const learningPlanDraftPatchTaskRequestSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().nullable().optional(),
    objective: z.string().nullable().optional(),
    lessonBrief: z.string().nullable().optional(),
    practiceSteps: z.array(z.string()).optional(),
    submissionGuide: z.string().nullable().optional(),
    checkpoints: z.array(z.string()).optional(),
    acceptanceCriteria: z.string().nullable().optional(),
    estimatedMinutes: z.number().int().min(15).max(240).nullable().optional(),
    masteryPoints: z.array(z.string()).min(2).optional(),
    cautions: z.array(learningCautionItemSchema).min(1).optional(),
    recommendedForWeek1: z.boolean().optional(),
  })
  .openapi("LearningPlanDraftPatchTaskRequest")

export const learningPlanDraftPatchRequestSchema = z
  .object({
    title: z.string().nullable().optional(),
    goal: z.string().nullable().optional(),
    tasks: z.array(learningPlanDraftPatchTaskRequestSchema).optional(),
  })
  .openapi("LearningPlanDraftPatchRequest")

export const learningPlanDraftConfirmResponseDataSchema = z
  .object({
    learningPathId: z.string(),
    currentTaskId: z.string(),
    redirectTo: z.string(),
  })
  .openapi("LearningPlanDraftConfirmResponseData")

export const learningPlanDraftRegenerateRequestSchema = z
  .object({
    links: z.array(z.string().url()).min(1).max(5).optional(),
    userGoal: z.string().trim().optional(),
    weeklyHours: z.number().int().min(1).max(40).optional(),
    currentConstraints: z.string().trim().optional(),
  })
  .openapi("LearningPlanDraftRegenerateRequest")

export const quickActionSchema = z
  .object({
    label: z.string(),
    tone: z.enum(["primary", "secondary", "warning"]),
    helper: z.string(),
    category: z.enum(["progress", "help", "hint"]),
  })
  .openapi("QuickAction")

export const learningReplySchema = z
  .object({
    trigger: z.string().optional(),
    kind: z.enum(["coach", "task_feedback"]),
    title: z.string().optional(),
    content: z.string(),
    xp: z.number().optional(),
    nextStep: z.string().optional(),
  })
  .openapi("LearningReply")

export const learningResumeSchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    lastSeenLabel: z.string(),
    ctaLabel: z.string(),
  })
  .openapi("LearningResume")

export const learningPlanSummarySchema = z
  .object({
    selectedToolName: z.string(),
    learningLevelLabel: z.string(),
    selectionModeLabel: z.string(),
    selectionMode: z.enum(["self_directed", "preset_training"]),
    pathName: z.string().optional(),
  })
  .openapi("LearningPlanSummary")

export const learningSupportOptionSchema = z
  .object({
    mode: z.enum(["hint", "breakdown", "minimal_example"]),
    label: z.string(),
    description: z.string(),
    prompt: z.string(),
  })
  .openapi("LearningSupportOption")

export const recentPracticeRoundSchema = z
  .object({
    id: z.string(),
    taskTitle: z.string(),
    stageLabel: z.string(),
    lastActiveLabel: z.string(),
    status: z.enum(["completed", "in_progress", "paused"]),
  })
  .openapi("RecentPracticeRound")

export const learningTaskSchema = z
  .object({
    id: z.number().int(),
    label: z.string(),
    done: z.boolean(),
    current: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
  .openapi("LearningTask")

export const learningKnowledgeTagSchema = z
  .object({
    label: z.string(),
    color: z.string(),
  })
  .openapi("LearningKnowledgeTag")

export const learningMissionSchema = z
  .object({
    title: z.string(),
    tool: z.string(),
    stageLabel: z.string(),
    goal: z.string(),
    summary: z.string(),
    estimatedTime: z.string(),
    reward: z.string(),
    progressLabel: z.string(),
    progressPercent: z.number(),
    coachCue: z.string(),
    nextUnlockTitle: z.string(),
    nextUnlockSummary: z.string(),
    nextPreviewIsFinal: z.boolean(),
  })
  .openapi("LearningMission")

export const learningCurrentSessionResponseDataSchema = z
  .object({
    conversationId: z.string().nullable(),
    historyPagination: learningHistoryPaginationSchema,
    activeMaterialPlanIntake: z.object({
      intakeId: z.string().uuid(),
      status: materialPlanAsyncStatusSchema,
      processingStage: z.string().nullable(),
      progressPercent: z.number().nullable(),
      progressMessage: z.string().nullable(),
      draftId: z.string().uuid().nullable(),
      runId: z.string().uuid().nullable(),
      errorCode: z.string().nullable(),
      errorMessage: z.string().nullable(),
      updatedAt: z.string(),
    }).nullable(),
    pendingMaterialPlanDraft: z.object({
      draftId: z.string().uuid(),
      intakeId: z.string().uuid(),
      updatedAt: z.string(),
    }).nullable(),
    path: z.object({
      id: z.string(),
      status: z.literal("in_progress"),
    }),
    task: z.object({
      taskId: z.string(),
      title: z.string(),
      status: learningTaskStateSchema,
    }),
    profile: profileMeResponseDataSchema,
    planSummary: learningPlanSummarySchema,
    mission: learningMissionSchema.nullable(),
    resume: learningResumeSchema.nullable(),
    messages: z.array(messageSchema),
    quickActions: z.array(quickActionSchema),
    supportOptions: z.array(learningSupportOptionSchema),
    responseSamples: z.array(learningReplySchema),
    rightPanel: z.object({
      currentStep: z.string(),
      whyThisStep: z.string(),
      completionCriteria: z.string(),
      hintIfStuck: z.string(),
      knowledgePoints: z.array(z.string()),
      masteryPoints: z.array(z.string()),
      cautions: z.array(learningCautionItemSchema),
      lessonBrief: z.string(),
      practiceSteps: z.array(z.string()),
      submissionGuide: z.string(),
      checkpoints: z.array(z.string()),
      nextStepPreview: z.string(),
    }),
    recentPracticeRounds: z.array(recentPracticeRoundSchema),
    tasks: z.array(learningTaskSchema),
    knowledgeTags: z.array(learningKnowledgeTagSchema),
  })
  .openapi("LearningCurrentSessionResponseData")

export const learningRestartConversationResponseDataSchema = z
  .object({
    restarted: z.boolean(),
    closedSessionId: z.string().nullable(),
    message: z.string().optional(),
  })
  .openapi("LearningRestartConversationResponseData")

export const completeTaskRequestSchema = z
  .object({
    taskId: z.string(),
    conversationId: z.string().nullable().optional(),
  })
  .openapi("CompleteTaskRequest")

export const completeTaskResponseDataSchema = z
  .object({
    taskId: z.string(),
    taskStatus: z.literal("completed"),
    scoreDelta: z.number(),
    currentScore: z.number(),
    currentRank: z.string(),
    rankChanged: z.boolean(),
    completionSummary: z.string(),
    nextTask: z
      .object({
        taskId: z.string(),
        title: z.string(),
      })
      .nullable(),
  })
  .openapi("CompleteTaskResponseData")

export const updateTaskStatusRequestSchema = z
  .object({
    taskId: z.string(),
    status: z.enum(["in_progress", "blocked"]),
    reason: z.string().nullable().optional(),
  })
  .openapi("UpdateTaskStatusRequest")

export const updateTaskStatusResponseDataSchema = z
  .object({
    taskId: z.string(),
    taskStatus: z.enum(["in_progress", "blocked"]),
    reason: z.string().nullable(),
  })
  .openapi("UpdateTaskStatusResponseData")

export const progressToolSchema = z
  .object({
    id: z.string(),
    label: z.string(),
  })
  .openapi("ProgressTool")

export const mapSummarySchema = z
  .object({
    totalXP: z.number(),
    currentRank: z.string(),
    nextRank: z.string(),
    remainingXPToNextRank: z.number(),
    streakDays: z.number().int().nonnegative(),
  })
  .openapi("MapSummary")

export const progressCurrentResponseDataSchema = z
  .object({
    currentTool: progressToolSchema,
    currentPathName: z.string(),
    currentTaskTitle: z.string(),
    currentScore: z.number(),
    currentRank: z.string(),
    streakDays: z.number().int().nonnegative(),
    checkedInToday: z.boolean(),
    summary: mapSummarySchema,
  })
  .openapi("ProgressCurrentResponseData")

export const stagePitfallSchema = z
  .object({
    text: z.string(),
    isTrap: z.boolean().optional(),
  })
  .openapi("StagePitfall")

export const stageSchema = z
  .object({
    id: z.number().int(),
    taskId: z.string(),
    reviewSessionId: z.string().uuid().nullable().optional(),
    title: z.string(),
    summary: z.string(),
    goal: z.string(),
    completionCriteria: z.string(),
    reviewSummary: z.string(),
    xp: z.number(),
    status: z.enum(["done", "current", "locked"]),
    tags: z.array(z.string()),
    keyPoints: z.array(z.string()),
    pitfalls: z.array(stagePitfallSchema),
    estimatedTime: z.string(),
    focus: z.string(),
    unlockHint: z.string().optional(),
  })
  .openapi("Stage")

export const progressMapResponseDataSchema = z
  .object({
    pathName: z.string(),
    pathSummary: z.string(),
    totalSteps: z.number().int().nonnegative(),
    completedSteps: z.number().int().nonnegative(),
    currentStageId: z.number().int(),
    stages: z.array(stageSchema),
  })
  .openapi("ProgressMapResponseData")

export const achievementRankCodeSchema = z
  .enum(["rookie", "apprentice", "vibe_coder", "builder", "master"])
  .openapi("AchievementRankCode")

export const achievementBadgeCodeSchema = z
  .enum([
    "first_task",
    "seven_day_streak",
    "first_debug",
    "first_project",
    "multi_tool_master",
    "monthly_champion",
  ])
  .openapi("AchievementBadgeCode")

export const achievementOverviewSchema = z
  .object({
    totalXP: z.number(),
    streakDays: z.number().int().nonnegative(),
    monthlyXP: z.number(),
    totalCheckinDays: z.number().int().nonnegative(),
    nextRankRemainingXP: z.number(),
    earnedBadges: z.number().int().nonnegative(),
  })
  .openapi("AchievementOverview")

export const achievementRankSchema = z
  .object({
    code: achievementRankCodeSchema,
    name: z.string(),
    minScore: z.number(),
    maxScore: z.number(),
  })
  .openapi("AchievementRank")

export const achievementBadgeSchema = z
  .object({
    code: achievementBadgeCodeSchema,
    title: z.string(),
    desc: z.string(),
    earned: z.boolean(),
    progressHint: z.string().optional(),
  })
  .openapi("AchievementBadge")

export const achievementHistoryItemSchema = z
  .object({
    label: z.string(),
    xp: z.number(),
    time: z.string(),
    type: z.enum(["task", "checkin", "bonus", "badge"]),
  })
  .openapi("AchievementHistoryItem")

export const achievementSummaryResponseDataSchema = z
  .object({
    currentRankCode: achievementRankCodeSchema,
    currentRank: z.string(),
    currentScore: z.number(),
    checkedInToday: z.boolean(),
    nextRank: z.string(),
    nextRankRemainingXP: z.number(),
    completedTaskCount: z.number().int().nonnegative(),
    streakDays: z.number().int().nonnegative(),
    overview: achievementOverviewSchema,
    ranks: z.array(achievementRankSchema),
    badges: z.array(achievementBadgeSchema),
    history: z.array(achievementHistoryItemSchema),
    calendar: z.object({
      weekDays: z.array(z.string()),
      dates: z.array(z.array(z.number().int())),
      checkins: z.array(z.array(z.boolean())),
    }),
  })
  .openapi("AchievementSummaryResponseData")

export const checkinDailyResponseDataSchema = z
  .object({
    checkedIn: z.boolean(),
    alreadyCheckedIn: z.boolean(),
    checkinDate: z.string(),
    scoreDelta: z.number(),
    streakDays: z.number().int().nonnegative(),
    currentScore: z.number(),
    currentRank: z.string(),
    rankChanged: z.boolean(),
  })
  .openapi("CheckinDailyResponseData")

export const analyticsEventPropertiesSchema = z
  .record(z.unknown())
  .openapi("AnalyticsEventProperties")

export const analyticsTrackEventRequestSchema = z
  .object({
    eventName: z.enum([
      "landing_cta_click",
      "login_submit",
      "onboarding_submit",
      "learning_input_send",
      "learning_quick_help",
      "session_resumed",
      "stuck_help_requested",
      "task_completed",
      "daily_checkin",
      "map_stage_click",
      "achievement_cta_click",
    ]),
    pagePath: z.string().nullable().optional(),
    properties: analyticsEventPropertiesSchema.optional(),
    occurredAt: z.string().nullable().optional(),
  })
  .openapi("AnalyticsTrackEventRequest")

export const analyticsTrackEventResponseDataSchema = z
  .object({
    eventId: z.string(),
    accepted: z.literal(true),
  })
  .openapi("AnalyticsTrackEventResponseData")

export const analyticsAggregateBucketSchema = z
  .object({
    key: z.string(),
    count: z.number().int().nonnegative(),
  })
  .openapi("AnalyticsAggregateBucket")

export const analyticsDailyTrendPointSchema = z
  .object({
    date: z.string(),
    count: z.number().int().nonnegative(),
    uniqueUsers: z.number().int().nonnegative(),
  })
  .openapi("AnalyticsDailyTrendPoint")

export const analyticsAggregateSummarySchema = z
  .object({
    totalEvents: z.number().int().nonnegative(),
    uniqueUsers: z.number().int().nonnegative(),
    byEventName: z.array(analyticsAggregateBucketSchema),
    byPagePath: z.array(analyticsAggregateBucketSchema),
    dailyTrend: z.array(analyticsDailyTrendPointSchema),
  })
  .openapi("AnalyticsAggregateSummary")

export const notificationSettingsDataSchema = z
  .object({
    checkinReminder: z.boolean(),
    checkinTime: z.string(),
    progressPush: z.boolean(),
    remindMethods: z.object({
      app: z.boolean(),
      email: z.boolean(),
      wechat: z.boolean(),
    }),
    doNotDisturb: z.boolean(),
    doNotDisturbStart: z.string(),
    doNotDisturbEnd: z.string(),
  })
  .openapi("NotificationSettingsData")

export const notificationInAppItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(USER_NOTIFICATION_TYPES),
    title: z.string(),
    content: z.string(),
    status: z.enum(USER_NOTIFICATION_STATUSES),
    payload: z.record(z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
    scheduledFor: z.string().nullable(),
    readAt: z.string().nullable(),
    dismissedAt: z.string().nullable(),
    actionHref: z.string().nullable(),
    actionLabel: z.string().nullable(),
  })
  .openapi("NotificationInAppItem")

export const notificationInAppListResponseDataSchema = z
  .object({
    items: z.array(notificationInAppItemSchema),
    unreadCount: z.number().int().nonnegative(),
  })
  .openapi("NotificationInAppListResponseData")

export const notificationMutationResponseDataSchema = z
  .object({
    id: z.string(),
    status: z.enum(USER_NOTIFICATION_STATUSES),
    readAt: z.string().nullable(),
    dismissedAt: z.string().nullable(),
  })
  .openapi("NotificationMutationResponseData")

export const historyFilterSchema = z
  .enum(["all", "completed", "in_progress", "interrupted", "abandoned"])
  .openapi("HistoryFilter")

export const historyPlanActionSchema = z
  .enum(["abandon", "reactivate", "archive"])
  .openapi("HistoryPlanAction")

export const learningHistoryProgressSchema = z
  .object({
    completed: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    percent: z.number(),
  })
  .openapi("LearningHistoryProgress")

export const learningHistorySchema = z
  .object({
    id: z.string(),
    planId: z.string(),
    title: z.string(),
    summary: z.string(),
    tool: z.string(),
    level: z.string(),
    mode: z.string(),
    progress: learningHistoryProgressSchema,
    xpEarned: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.enum(["completed", "in_progress", "interrupted", "abandoned"]),
  })
  .openapi("LearningHistory")

export const learningHistorySummarySchema = z
  .object({
    activeCount: z.number().int().nonnegative(),
    interruptedCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    abandonedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
    activePlanId: z.string().nullable(),
    canCreateNewPlan: z.boolean(),
  })
  .openapi("LearningHistorySummary")

export const learningHistoryResponseDataSchema = z
  .object({
    items: z.array(learningHistorySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    hasMore: z.boolean(),
    filter: historyFilterSchema,
    summary: learningHistorySummarySchema,
  })
  .openapi("LearningHistoryResponseData")

export const historyRecentQuerySchema = z
  .object({
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
    status: historyFilterSchema.optional(),
  })
  .openapi("HistoryRecentQuery")

export const updateLearningHistoryStatusRequestSchema = z
  .object({
    action: historyPlanActionSchema,
  })
  .openapi("UpdateLearningHistoryStatusRequest")

export const updateLearningHistoryStatusResponseDataSchema = z
  .object({
    pathId: z.string(),
    status: z.enum(["completed", "in_progress", "interrupted", "abandoned"]),
  })
  .openapi("UpdateLearningHistoryStatusResponseData")

export const learningHistoryDetailStepSchema = z
  .object({
    id: z.string(),
    stepNo: z.number().int().positive(),
    title: z.string(),
    status: learningTaskStateSchema,
    rewardXp: z.number(),
    completedAt: z.string().nullable(),
  })
  .openapi("LearningHistoryDetailStep")

export const learningHistoryDetailResponseDataSchema = z
  .object({
    detail: z.object({
      item: learningHistorySchema,
      timeline: z.object({
        startedAt: z.string(),
        lastActivityAt: z.string().nullable(),
        completedAt: z.string().nullable(),
        interruptedAt: z.string().nullable(),
        abandonedAt: z.string().nullable(),
      }),
      steps: z.array(learningHistoryDetailStepSchema),
    }),
  })
  .openapi("LearningHistoryDetailResponseData")

export const feedbackTypeSchema = z.enum(FEEDBACK_TYPES).openapi("FeedbackType")
export const feedbackStatusSchema = z.enum(FEEDBACK_STATUSES).openapi("FeedbackStatus")
export const feedbackPrioritySchema = z.enum(FEEDBACK_PRIORITIES).openapi("FeedbackPriority")
export const feedbackReplyAuthorTypeSchema = z.enum(FEEDBACK_REPLY_AUTHOR_TYPES).openapi("FeedbackReplyAuthorType")
export const feedbackSourceSchema = z.enum(FEEDBACK_SOURCES).openapi("FeedbackSource")

export const createFeedbackRequestSchema = z
  .object({
    feedbackType: feedbackTypeSchema,
    title: z.string(),
    content: z.string(),
    contactMethod: z.string().nullable().optional(),
    source: feedbackSourceSchema.nullable().optional(),
  })
  .openapi("CreateFeedbackRequest")

export const createFeedbackResponseDataSchema = z
  .object({
    ticketId: z.string(),
  })
  .openapi("CreateFeedbackResponseData")

export const feedbackReplyItemSchema = z
  .object({
    id: z.string(),
    authorType: feedbackReplyAuthorTypeSchema,
    authorId: z.string().nullable(),
    content: z.string(),
    createdAt: z.string(),
  })
  .openapi("FeedbackReplyItem")

export const feedbackTicketListItemSchema = z
  .object({
    id: z.string(),
    feedbackType: feedbackTypeSchema,
    feedbackTypeLabel: z.string(),
    status: feedbackStatusSchema,
    statusLabel: z.string(),
    title: z.string(),
    contentPreview: z.string(),
    contactMethod: z.string().nullable(),
    latestReplySnippet: z.string().nullable(),
    replyCount: z.number().int().nonnegative(),
    submittedAt: z.string(),
    updatedAt: z.string(),
    lastReplyAt: z.string().nullable(),
  })
  .openapi("FeedbackTicketListItem")

export const feedbackMineListResponseDataSchema = z
  .object({
    items: z.array(feedbackTicketListItemSchema),
  })
  .openapi("FeedbackMineListResponseData")

export const feedbackTicketDetailSchema = z
  .object({
    id: z.string(),
    feedbackType: feedbackTypeSchema,
    feedbackTypeLabel: z.string(),
    status: feedbackStatusSchema,
    statusLabel: z.string(),
    title: z.string(),
    content: z.string(),
    contactMethod: z.string().nullable(),
    submittedAt: z.string(),
    updatedAt: z.string(),
    lastReplyAt: z.string().nullable(),
    replies: z.array(feedbackReplyItemSchema),
  })
  .openapi("FeedbackTicketDetail")

export const adminFeedbackListItemSchema = z
  .object({
    id: z.string(),
    feedbackType: feedbackTypeSchema,
    feedbackTypeLabel: z.string(),
    status: feedbackStatusSchema,
    statusLabel: z.string(),
    title: z.string(),
    contentPreview: z.string(),
    contactMethod: z.string().nullable(),
    latestReplySnippet: z.string().nullable(),
    replyCount: z.number().int().nonnegative(),
    submittedAt: z.string(),
    updatedAt: z.string(),
    lastReplyAt: z.string().nullable(),
    userId: z.string(),
    userNicknameSnapshot: z.string().nullable(),
    userAvatarUrl: z.string().nullable(),
    userPhoneSnapshot: z.string().nullable(),
    userContactEmailSnapshot: z.string().nullable(),
    priority: feedbackPrioritySchema,
    source: z.string().nullable(),
  })
  .openapi("AdminFeedbackListItem")

export const adminFeedbackListStatsSchema = z
  .object({
    ticketTotal: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    inReview: z.number().int().nonnegative(),
    highPriority: z.number().int().nonnegative(),
  })
  .openapi("AdminFeedbackListStats")

export const adminFeedbackListResponseDataSchema = z
  .object({
    items: z.array(adminFeedbackListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    stats: adminFeedbackListStatsSchema,
  })
  .openapi("AdminFeedbackListResponseData")

export const adminFeedbackUserSnapshotSchema = z
  .object({
    avatarUrl: z.string().nullable(),
    nickname: z.string().nullable(),
    email: z.string().nullable(),
    currentScore: z.number().int().nonnegative(),
    currentRank: z.string().nullable(),
    streakDays: z.number().int().nonnegative(),
    activePlanName: z.string().nullable(),
    primaryToolName: z.string().nullable(),
    learningLevelLabel: z.string().nullable(),
    completedTaskCount: z.number().int().nonnegative(),
    lastLearningAt: z.string().nullable(),
    totalTicketCount: z.number().int().nonnegative(),
    createdAt: z.string().nullable(),
  })
  .openapi("AdminFeedbackUserSnapshot")

export const adminFeedbackTicketDetailResponseDataSchema = z
  .object({
    id: z.string(),
    feedbackType: feedbackTypeSchema,
    feedbackTypeLabel: z.string(),
    status: feedbackStatusSchema,
    statusLabel: z.string(),
    title: z.string(),
    content: z.string(),
    contactMethod: z.string().nullable(),
    submittedAt: z.string(),
    updatedAt: z.string(),
    lastReplyAt: z.string().nullable(),
    replies: z.array(feedbackReplyItemSchema),
    userId: z.string(),
    userNicknameSnapshot: z.string().nullable(),
    userPhoneSnapshot: z.string().nullable(),
    userContactEmailSnapshot: z.string().nullable(),
    priority: feedbackPrioritySchema,
    source: z.string().nullable(),
    userSnapshot: adminFeedbackUserSnapshotSchema,
  })
  .openapi("AdminFeedbackTicketDetailResponseData")

export const adminFeedbackListQuerySchema = z
  .object({
    status: feedbackStatusSchema.optional(),
    feedbackType: feedbackTypeSchema.optional(),
    priority: feedbackPrioritySchema.optional(),
    keyword: z.string().optional(),
    userId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
  })
  .openapi("AdminFeedbackListQuery")

export const adminReplyFeedbackRequestSchema = z
  .object({
    content: z.string(),
    status: feedbackStatusSchema.optional(),
  })
  .openapi("AdminReplyFeedbackRequest")

export const adminUpdateFeedbackStatusRequestSchema = z
  .object({
    status: feedbackStatusSchema,
  })
  .openapi("AdminUpdateFeedbackStatusRequest")

export const adminFeedbackBatchDeleteRequestSchema = z
  .object({
    ids: z.array(z.string()).min(1),
  })
  .openapi("AdminFeedbackBatchDeleteRequest")

export const adminFeedbackDeleteOkDataSchema = z
  .object({ deleted: z.literal(true) })
  .openapi("AdminFeedbackDeleteOkData")

export const adminFeedbackBatchDeleteResponseDataSchema = z
  .object({
    deletedCount: z.number().int().nonnegative(),
    deletedIds: z.array(z.string()),
  })
  .openapi("AdminFeedbackBatchDeleteResponseData")

export const adminFeedbackUserSnapshotResponseDataSchema = z
  .object({
    ticketId: z.string(),
    userId: z.string(),
    userSnapshot: adminFeedbackUserSnapshotSchema,
  })
  .openapi("AdminFeedbackUserSnapshotResponseData")

export const openApiStreamResponseSchema = z
  .string()
  .openapi("OpenApiSseStream")

// ============================================
// 管理员认证 API Schemas
// ============================================

export const adminAccountStatusSchema = z.enum(ADMIN_ACCOUNT_STATUSES).openapi("AdminAccountStatus")

export const adminRoleCodeSchema = z.enum(ADMIN_ROLE_CODES).openapi("AdminRoleCode")

export const adminAuditActionSchema = z.enum(ADMIN_AUDIT_ACTIONS).openapi("AdminAuditAction")

export const adminLoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: nonEmptyStringSchema,
  })
  .openapi("AdminLoginRequest")

export const adminChangePasswordRequestSchema = z
  .object({
    currentPassword: nonEmptyStringSchema,
    newPassword: z.string().min(1),
  })
  .openapi("AdminChangePasswordRequest")

export const adminLoginEmailUpdateRequestSchema = z
  .object({
    email: z.string().trim().email(),
  })
  .openapi("AdminLoginEmailUpdateRequest")

export const adminLoginEmailUpdateResponseDataSchema = z
  .object({
    userId: z.string(),
    email: z.string().email(),
  })
  .openapi("AdminLoginEmailUpdateResponseData")

export const adminSessionResponseDataSchema = z
  .object({
    adminAccountId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: nonEmptyStringSchema,
    avatarUrl: z.string().nullable(),
    roles: z.array(adminRoleCodeSchema),
    status: adminAccountStatusSchema,
  })
  .openapi("AdminSessionResponseData")

export const adminSettingsAccountListStatusSchema = z
  .enum(ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES)
  .openapi("AdminSettingsAccountListStatus")

export const adminSettingsAccountStatusActionSchema = z
  .enum(ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS)
  .openapi("AdminSettingsAccountStatusAction")

export const adminSettingsAuditTargetTypeSchema = z
  .enum(ADMIN_SETTINGS_AUDIT_TARGET_TYPES)
  .openapi("AdminSettingsAuditTargetType")

export const adminSettingsCurrentAdminSchema = z
  .object({
    adminAccountId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: nonEmptyStringSchema,
    avatarUrl: z.string().nullable(),
    email: z.string().nullable(),
    loginEmail: z.string().nullable(),
    contactEmail: z.string().nullable(),
    status: adminAccountStatusSchema,
    roles: z.array(adminRoleCodeSchema),
    lastLoginAt: z.string().nullable(),
  })
  .openapi("AdminSettingsCurrentAdmin")

export const adminSettingsStatsSchema = z
  .object({
    totalAdminAccounts: z.number().int().nonnegative(),
    activeAdminAccounts: z.number().int().nonnegative(),
    inactiveAdminAccounts: z.number().int().nonnegative(),
    suspendedAdminAccounts: z.number().int().nonnegative(),
  })
  .openapi("AdminSettingsStats")

export const adminSettingsRoleDefinitionSchema = z
  .object({
    code: adminRoleCodeSchema,
    name: z.string(),
    description: z.string().nullable(),
    accountCount: z.number().int().nonnegative(),
  })
  .openapi("AdminSettingsRoleDefinition")

export const adminSettingsSystemInfoSchema = z
  .object({
    appName: z.string(),
    appVersion: z.string(),
    environment: z.string(),
    nextVersion: z.string().nullable(),
    reactVersion: z.string().nullable(),
    adminAuthMode: z.string(),
    database: z.string(),
    storage: z.string(),
    auth: z.string(),
  })
  .openapi("AdminSettingsSystemInfo")

export const adminSettingsOverviewResponseDataSchema = z
  .object({
    currentAdmin: adminSettingsCurrentAdminSchema,
    stats: adminSettingsStatsSchema.extend({
      auditLogCountLast7Days: z.number().int().nonnegative(),
    }),
    roleDefinitions: z.array(adminSettingsRoleDefinitionSchema),
    systemInfo: adminSettingsSystemInfoSchema,
  })
  .openapi("AdminSettingsOverviewResponseData")

export const adminSettingsAdminAccountListItemSchema = z
  .object({
    adminAccountId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    email: z.string().nullable(),
    roles: z.array(adminRoleCodeSchema),
    status: adminAccountStatusSchema,
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("AdminSettingsAdminAccountListItem")

export const adminSettingsAdminAccountListResponseDataSchema = z
  .object({
    items: z.array(adminSettingsAdminAccountListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    stats: adminSettingsStatsSchema,
  })
  .openapi("AdminSettingsAdminAccountListResponseData")

export const adminSettingsAdminAccountListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    status: adminSettingsAccountListStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .openapi("AdminSettingsAdminAccountListQuery")

export const adminSettingsAdminAccountIdParamsSchema = z
  .object({
    adminAccountId: z.string().uuid(),
  })
  .openapi("AdminSettingsAdminAccountIdParams")

export const adminUpdateAdminAccountStatusRequestSchema = z
  .object({
    action: adminSettingsAccountStatusActionSchema,
    reason: z.string().nullable().optional(),
  })
  .openapi("AdminUpdateAdminAccountStatusRequest")

export const adminUpdateAdminAccountStatusResponseDataSchema = z
  .object({
    adminAccountId: z.string().uuid(),
    status: adminAccountStatusSchema,
  })
  .openapi("AdminUpdateAdminAccountStatusResponseData")

export const adminSettingsAuditLogListItemSchema = z
  .object({
    id: z.string().uuid(),
    action: adminAuditActionSchema,
    targetType: z.enum(["admin_account", "user_profile", "user_learning_path", "site_contact"]),
    targetId: z.string().nullable(),
    actorAdminAccountId: z.string(),
    actorDisplayName: z.string(),
    reason: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("AdminSettingsAuditLogListItem")

export const adminSettingsAuditLogListResponseDataSchema = z
  .object({
    items: z.array(adminSettingsAuditLogListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
  })
  .openapi("AdminSettingsAuditLogListResponseData")

export const adminSettingsAuditLogListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    action: z.string().optional(),
    targetType: adminSettingsAuditTargetTypeSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .openapi("AdminSettingsAuditLogListQuery")

// ============================================
// 企业联系方式管理 Schemas (for /admin/settings/contact and /api/contact)
// ============================================

export const contactChannelConfigSchema = z
  .object({
    title: z.string(),
    handle: z.string(),
    maskedHandle: z.string().optional(),
    summary: z.string(),
    qrLabel: z.string(),
    qrImageUrl: z.string().url().nullable().optional(),
    qrSeed: z.number().int().min(0).optional(),
    type: z.enum(["wechat", "douyin"]),
  })
  .openapi("ContactChannelConfig")

export const siteContactSettingsSchema = z
  .object({
    companyName: z.string().min(1),
    address: z.string().min(1),
    website: z.string().url(),
    contactEmail: z.string().email(),
    serviceHours: z.string(),
    contactChannels: z.array(contactChannelConfigSchema),
    updatedAt: z.string().nullable(),
    updatedByAdminId: z.string().uuid().nullable().optional(),
  })
  .openapi("SiteContactSettings")

export const adminSiteContactResponseDataSchema = siteContactSettingsSchema.openapi(
  "AdminSiteContactResponseData"
)

export const updateSiteContactRequestSchema = z
  .object({
    companyName: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    website: z.string().url().optional(),
    contactEmail: z.string().email().optional(),
    serviceHours: z.string().optional(),
    contactChannels: z.array(contactChannelConfigSchema).optional(),
  })
  .openapi("UpdateSiteContactRequest")

export const uploadQrCodeResponseDataSchema = z
  .object({
    qrImageUrl: z.string().url(),
    storagePath: z.string(),
  })
  .openapi("UploadQrCodeResponseData")

export const paymentPlanCodeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/)
  .openapi("PaymentPlanCode", {
    description: "3-64 位套餐编码：小写字母/数字开头结尾，中间可含下划线或短横线。",
    example: "personal_monthly",
  })
export const paymentPlanCodeParamsSchema = z
  .object({
    code: paymentPlanCodeSchema,
  })
  .openapi("PaymentPlanCodeParams")
export const paymentOrderStatusSchema = z.enum(PAYMENT_ORDER_STATUSES).openapi("PaymentOrderStatus")
export const paymentChannelSchema = z.enum(["wechat", "alipay"]).openapi("PaymentChannel")

export const subscriptionPlanItemSchema = z
  .object({
    code: paymentPlanCodeSchema,
    name: z.string(),
    priceCents: z.number().int().nonnegative(),
    currency: z.literal("CNY"),
    durationDays: z.number().int().positive(),
    tierRank: z.number().int(),
    description: z.string(),
    features: z.array(z.string()),
    periodLabel: z.string(),
    ctaLabel: z.string(),
    highlight: z.boolean(),
    purchasable: z.boolean(),
    active: z.boolean(),
    displayOrder: z.number().int(),
    archivedAt: z.string().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .openapi("SubscriptionPlanItem")

export const subscriptionPlansResponseDataSchema = z
  .object({
    plans: z.array(subscriptionPlanItemSchema),
  })
  .openapi("SubscriptionPlansResponseData")

export const subscriptionMeResponseDataSchema = z
  .object({
    current: z.object({
      planCode: z.string(),
      planName: z.string(),
      status: z.enum(["free", "active", "expired"]),
      startsAt: z.string().nullable(),
      expiresAt: z.string().nullable(),
      remainingDays: z.number().int().nonnegative(),
    }),
    plans: z.array(subscriptionPlanItemSchema),
  })
  .openapi("SubscriptionMeResponseData")

export const createWechatNativeOrderRequestSchema = z
  .object({
    planCode: paymentPlanCodeSchema,
  })
  .openapi("CreateWechatNativeOrderRequest")

export const createAlipayPrecreateOrderRequestSchema = z
  .object({
    planCode: paymentPlanCodeSchema,
  })
  .openapi("CreateAlipayPrecreateOrderRequest")

export const paymentOrderResponseDataSchema = z
  .object({
    orderNo: z.string(),
    planCode: paymentPlanCodeSchema,
    planName: z.string(),
    amountCents: z.number().int().positive(),
    currency: z.literal("CNY"),
    status: paymentOrderStatusSchema,
    paymentChannel: paymentChannelSchema,
    codeUrl: z.string().nullable(),
    expiresAt: z.string(),
    paidAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("PaymentOrderResponseData")

export const paymentOrderListResponseDataSchema = z
  .object({
    items: z.array(paymentOrderResponseDataSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
    summary: z.object({
      totalCount: z.number().int().nonnegative(),
      pendingCount: z.number().int().nonnegative(),
      paidCount: z.number().int().nonnegative(),
      closedCount: z.number().int().nonnegative(),
      expiredCount: z.number().int().nonnegative(),
      failedCount: z.number().int().nonnegative(),
    }),
  })
  .openapi("PaymentOrderListResponseData")

export const adminFinanceOrderListItemSchema = z
  .object({
    orderNo: z.string(),
    userId: z.string(),
    userNickname: z.string().nullable(),
    userPhone: z.string().nullable(),
    planCode: paymentPlanCodeSchema,
    planName: z.string(),
    amountCents: z.number().int().positive(),
    currency: z.literal("CNY"),
    status: paymentOrderStatusSchema,
    paymentChannel: paymentChannelSchema,
    providerTradeNo: z.string().nullable(),
    paidAt: z.string().nullable(),
    expiresAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminFinanceOrderListItem")

export const adminFinanceOrderListResponseDataSchema = z
  .object({
    items: z.array(adminFinanceOrderListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    stats: z.object({
      totalOrders: z.number().int().nonnegative(),
      paidOrders: z.number().int().nonnegative(),
      pendingOrders: z.number().int().nonnegative(),
      revenueCents: z.number().int().nonnegative(),
    }),
  })
  .openapi("AdminFinanceOrderListResponseData")

export const adminFinanceOrderDetailResponseDataSchema = z
  .object({
    order: adminFinanceOrderListItemSchema.extend({
      codeUrl: z.string().nullable(),
      userDeletedAt: z.string().nullable(),
      cancelledAt: z.string().nullable(),
      cancelReason: z.string().nullable(),
      wechatTransactionId: z.string().nullable(),
      alipayTradeNo: z.string().nullable(),
      prepayPayload: z.record(z.unknown()),
      callbackPayload: z.record(z.unknown()),
    }),
    timeline: z.array(z.object({
      label: z.string(),
      at: z.string(),
      status: z.union([paymentOrderStatusSchema, z.literal("created")]),
    })),
  })
  .openapi("AdminFinanceOrderDetailResponseData")

export const adminFinanceStatsResponseDataSchema = z
  .object({
    range: z.object({ dateFrom: z.string(), dateTo: z.string() }),
    overview: z.object({
      revenueCents: z.number().int().nonnegative(),
      paidOrders: z.number().int().nonnegative(),
      pendingOrders: z.number().int().nonnegative(),
      closedOrders: z.number().int().nonnegative(),
      expiredOrders: z.number().int().nonnegative(),
      failedOrders: z.number().int().nonnegative(),
      averageOrderValueCents: z.number().int().nonnegative(),
    }),
    channelBreakdown: z.array(z.object({
      channel: paymentChannelSchema,
      revenueCents: z.number().int().nonnegative(),
      paidOrders: z.number().int().nonnegative(),
    })),
    planBreakdown: z.array(z.object({
      planCode: paymentPlanCodeSchema,
      planName: z.string(),
      revenueCents: z.number().int().nonnegative(),
      paidOrders: z.number().int().nonnegative(),
    })),
    dailyTrend: z.array(z.object({
      date: z.string(),
      revenueCents: z.number().int().nonnegative(),
      paidOrders: z.number().int().nonnegative(),
    })),
  })
  .openapi("AdminFinanceStatsResponseData")

export const adminWechatPaymentSettingsResponseDataSchema = z
  .object({
    enabled: z.boolean(),
    configured: z.boolean(),
    appId: z.string().nullable(),
    mchId: z.string().nullable(),
    notifyUrl: z.string().nullable(),
    merchantSerialNo: z.string().nullable(),
    merchantPrivateKeyMasked: z.string(),
    apiV3KeyMasked: z.string(),
    wechatpayPublicKeyId: z.string().nullable(),
    wechatpayPublicKeyMasked: z.string(),
    updatedAt: z.string().nullable(),
    updatedByAdminId: z.string().nullable(),
  })
  .openapi("AdminWechatPaymentSettingsResponseData")

export const adminUpdateWechatPaymentSettingsRequestSchema = z
  .object({
    enabled: z.boolean().optional(),
    appId: z.string().optional(),
    mchId: z.string().optional(),
    notifyUrl: z.string().url().optional(),
    merchantSerialNo: z.string().optional(),
    merchantPrivateKeyPem: z.string().optional(),
    apiV3Key: z.string().optional(),
    wechatpayPublicKeyId: z.string().optional(),
    wechatpayPublicKeyPem: z.string().optional(),
  })
  .openapi("AdminUpdateWechatPaymentSettingsRequest")

export const adminAlipayPaymentSettingsResponseDataSchema = z
  .object({
    enabled: z.boolean(),
    configured: z.boolean(),
    appId: z.string().nullable(),
    notifyUrl: z.string().nullable(),
    signType: z.literal("RSA2"),
    appPrivateKeyMasked: z.string(),
    alipayPublicKeyMasked: z.string(),
    updatedAt: z.string().nullable(),
    updatedByAdminId: z.string().nullable(),
  })
  .openapi("AdminAlipayPaymentSettingsResponseData")

export const adminUpdateAlipayPaymentSettingsRequestSchema = z
  .object({
    enabled: z.boolean().optional(),
    appId: z.string().optional(),
    notifyUrl: z.string().url().optional(),
    appPrivateKeyPem: z.string().optional(),
    alipayPublicKeyPem: z.string().optional(),
  })
  .openapi("AdminUpdateAlipayPaymentSettingsRequest")

export const adminSubscriptionPlanListResponseDataSchema = z
  .object({
    items: z.array(subscriptionPlanItemSchema),
  })
  .openapi("AdminSubscriptionPlanListResponseData")

export const adminUpsertSubscriptionPlanRequestSchema = z
  .object({
    code: paymentPlanCodeSchema.optional(),
    name: z.string().optional(),
    priceCents: z.number().int().nonnegative().optional(),
    currency: z.literal("CNY").optional(),
    durationDays: z.number().int().positive().optional(),
    tierRank: z.number().int().optional(),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
    periodLabel: z.string().optional(),
    ctaLabel: z.string().optional(),
    highlight: z.boolean().optional(),
    purchasable: z.boolean().optional(),
    active: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .openapi("AdminUpsertSubscriptionPlanRequest")

// ============================================
// 管理员看板 API Schemas
// ============================================

export const adminDashboardTrendSchema = z.enum(["up", "down", "neutral"]).openapi("AdminDashboardTrend")

export const adminDashboardMetricSchema = z
  .object({
    value: z.number(),
    trend: adminDashboardTrendSchema,
    comparisonLabel: z.string().nullable(),
  })
  .openapi("AdminDashboardMetric")

export const adminDashboardHourlyPointSchema = z
  .object({
    time: z.string(),
    successRate: z.number(),
  })
  .openapi("AdminDashboardHourlyPoint")

export const adminDashboardDayActivePointSchema = z
  .object({
    day: z.string(),
    activeUsers: z.number().int().nonnegative(),
  })
  .openapi("AdminDashboardDayActivePoint")

export const adminDashboardFeedbackRowSchema = z
  .object({
    id: z.string().uuid(),
    userLabel: z.string(),
    typeLabel: z.string(),
    statusLabel: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    relativeTime: z.string(),
  })
  .openapi("AdminDashboardFeedbackRow")

export const adminDashboardAiHealthItemSchema = z
  .object({
    modelCode: z.string(),
    providerCode: z.string(),
    message: z.string(),
    severity: z.enum(["warning", "info"]),
    relativeTime: z.string(),
  })
  .openapi("AdminDashboardAiHealthItem")

export const adminDashboardOverviewResponseDataSchema = z
  .object({
    generatedAt: z.string(),
    pendingFeedbackCount: z.number().int().nonnegative(),
    todayNewUserCount: z.number().int().nonnegative(),
    todayCompletedTaskCount: z.number().int().nonnegative(),
    activeLearningPathCount: z.number().int().nonnegative(),
    todayCheckinCount: z.number().int().nonnegative(),
    todayOnboardingCompletedCount: z.number().int().nonnegative(),
    metrics: z.object({
      todayNewUsers: adminDashboardMetricSchema,
      todayOnboardingCompleted: adminDashboardMetricSchema,
      activeLearningPaths: adminDashboardMetricSchema,
      todayCompletedTasks: adminDashboardMetricSchema,
      todayCheckinUsers: adminDashboardMetricSchema,
      pendingFeedback: adminDashboardMetricSchema,
      aiSuccessRate24h: adminDashboardMetricSchema.nullable(),
      aiAvgLatencyMs24h: adminDashboardMetricSchema.nullable(),
    }),
    aiHourlySuccess: z.array(adminDashboardHourlyPointSchema).nullable(),
    weeklyActiveByDay: z.array(adminDashboardDayActivePointSchema).nullable(),
    weeklyActiveSubtitle: z.string(),
    recentFeedback: z.array(adminDashboardFeedbackRowSchema),
    aiHealth: z.array(adminDashboardAiHealthItemSchema).nullable(),
    canViewAiCharts: z.boolean(),
  })
  .openapi("AdminDashboardOverviewResponseData")

const adminNullableString = z.string().nullable()

export const adminUserExportViewDataSchema = z
  .object({
    userId: z.string().uuid(),
    nickname: adminNullableString,
    avatarUrl: adminNullableString,
    wechat: adminNullableString,
    contactEmail: adminNullableString,
    bio: adminNullableString,
    signupProvider: adminNullableString,
    lastLoginProvider: adminNullableString,
    lastLoginAt: adminNullableString,
    authPhone: adminNullableString,
    authEmail: adminNullableString,
    onboardingCompleted: z.boolean().nullable(),
    contentLanguage: adminNullableString,
    primaryToolCode: adminNullableString,
    primaryToolName: adminNullableString,
    activePathStatus: adminNullableString,
    activePathSelectionMode: adminNullableString,
    activePathLearningLevel: adminNullableString,
    activePathCode: adminNullableString,
    activePathName: adminNullableString,
    activePathStartedAt: adminNullableString,
    activePathLastActivityAt: adminNullableString,
    activePathTotalSteps: z.number().int().nullable(),
    activePathCompletedSteps: z.number().int().nullable(),
    activePathCompletionPercent: z.number().int().nullable(),
    activePathCompletedTaskCount: z.number().int(),
    activePathInProgressTaskCount: z.number().int(),
    activePathPendingTaskCount: z.number().int(),
    activePathBlockedTaskCount: z.number().int(),
    completedTaskCountTotal: z.number().int(),
    inProgressTaskCountTotal: z.number().int(),
    pendingTaskCountTotal: z.number().int(),
    blockedTaskCountTotal: z.number().int(),
    currentScore: z.number().int().nullable(),
    currentRankCode: adminNullableString,
    streakDays: z.number().int().nullable(),
    lastLearningAt: adminNullableString,
    profileCreatedAt: adminNullableString,
    profileUpdatedAt: adminNullableString,
    deletedAt: adminNullableString,
    deletedReason: adminNullableString,
  })
  .openapi("AdminUserExportViewData")

export const adminUserListResponseDataSchema = z
  .object({
    items: z.array(adminUserExportViewDataSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
  })
  .openapi("AdminUserListResponseData")

export const adminUserListQuerySchema = z
  .object({
    accountStatus: z.enum(["active", "deleted", "all"]).optional(),
    onboardingCompleted: z.enum(["true", "false"]).optional(),
    hasActiveLearningPath: z.enum(["true", "false"]).optional(),
    keyword: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .openapi("AdminUserListQuery")

export const adminUserIdParamsSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .openapi("AdminUserIdParams")

export const adminUpdateUserRequestSchema = z
  .object({
    nickname: z.string().optional(),
    bio: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    wechat: z.string().nullable().optional(),
    contentLanguage: z.string().optional(),
    onboardingCompleted: z.boolean().optional(),
  })
  .openapi("AdminUpdateUserRequest")

export const adminSoftDeleteUserRequestSchema = z
  .object({
    reason: z.string().nullable().optional(),
  })
  .openapi("AdminSoftDeleteUserRequest")

export const adminLearningPathStatusSchema = z
  .enum(["active", "interrupted", "completed", "abandoned", "archived"])
  .openapi("AdminLearningPathStatus")

export const adminLearningPathListStatusSchema = z
  .enum(["all", "active", "interrupted", "completed", "abandoned"])
  .openapi("AdminLearningPathListStatus")

export const adminLearningUpdatedWithinSchema = z
  .enum(["all", "7d", "30d", "90d"])
  .openapi("AdminLearningUpdatedWithin")

export const adminLearningToolOptionSchema = z
  .object({
    code: z.string(),
    name: z.string(),
  })
  .openapi("AdminLearningToolOption")

export const adminLearningPathListItemSchema = z
  .object({
    pathId: z.string().uuid(),
    userId: z.string().uuid(),
    userNickname: z.string().nullable(),
    userAvatarUrl: z.string().nullable(),
    userEmail: z.string().nullable(),
    toolCode: z.string(),
    toolName: z.string(),
    pathCode: z.string(),
    pathName: z.string(),
    learningLevel: learningLevelSchema,
    learningLevelLabel: z.string(),
    selectionMode: selectionModeSchema,
    selectionModeLabel: z.string(),
    status: z.enum(["active", "interrupted", "completed", "abandoned"]),
    progressPercent: z.number().int().min(0).max(100),
    completedTaskCount: z.number().int().nonnegative(),
    inProgressTaskCount: z.number().int().nonnegative(),
    blockedTaskCount: z.number().int().nonnegative(),
    totalTaskCount: z.number().int().nonnegative(),
    xpEarned: z.number().int().nonnegative(),
    startedAt: z.string(),
    lastLearningAt: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("AdminLearningPathListItem")

export const adminLearningPathListStatsSchema = z
  .object({
    totalPaths: z.number().int().nonnegative(),
    activeCount: z.number().int().nonnegative(),
    interruptedCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    abandonedCount: z.number().int().nonnegative(),
  })
  .openapi("AdminLearningPathListStats")

export const adminLearningPathListResponseDataSchema = z
  .object({
    items: z.array(adminLearningPathListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    stats: adminLearningPathListStatsSchema,
    toolOptions: z.array(adminLearningToolOptionSchema).optional(),
  })
  .openapi("AdminLearningPathListResponseData")

export const adminLearningPathListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    status: adminLearningPathListStatusSchema.optional(),
    toolCode: z.string().optional(),
    learningLevel: learningLevelSchema.optional(),
    updatedWithin: adminLearningUpdatedWithinSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .openapi("AdminLearningPathListQuery")

export const adminLearningPathIdParamsSchema = z
  .object({
    pathId: z.string().uuid(),
  })
  .openapi("AdminLearningPathIdParams")

export const adminLearningPathSessionIdParamsSchema = z
  .object({
    pathId: z.string().uuid(),
    sessionId: z.string().uuid(),
  })
  .openapi("AdminLearningPathSessionIdParams")

export const adminLearningPathTimelineSchema = z
  .object({
    startedAt: z.string(),
    lastActivityAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    interruptedAt: z.string().nullable(),
    abandonedAt: z.string().nullable(),
    archivedAt: z.string().nullable(),
  })
  .openapi("AdminLearningPathTimeline")

export const adminLearningPathDetailStepSchema = z
  .object({
    stepId: z.string(),
    stepNo: z.number().int().positive(),
    title: z.string(),
    lessonBrief: z.string().nullable(),
    practiceSteps: z.array(z.string()),
    submissionGuide: z.string().nullable(),
    checkpoints: z.array(z.string()),
    status: z.enum(["pending", "in_progress", "blocked", "completed"]),
    rewardXp: z.number().int().nonnegative(),
    completedAt: z.string().nullable(),
  })
  .openapi("AdminLearningPathDetailStep")

export const adminLearningPathRecentSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    status: z.string(),
    startedAt: z.string(),
    lastMessageAt: z.string().nullable(),
    messageCount: z.number().int().nonnegative(),
    latestUserSummary: z.string().nullable(),
    latestAssistantSummary: z.string().nullable(),
    tokenUsage: z
      .object({
        promptTokens: z.number().int().nonnegative(),
        completionTokens: z.number().int().nonnegative(),
        totalTokens: z.number().int().nonnegative(),
      })
      .nullable(),
  })
  .openapi("AdminLearningPathRecentSession")

export const adminLearningSessionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .openapi("AdminLearningSessionListQuery")

export const adminLearningPathSessionListResponseDataSchema = z
  .object({
    items: z.array(adminLearningPathRecentSessionSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminLearningPathSessionListResponseData")

export const adminLearningPathSessionDetailResponseDataSchema = z
  .object({
    session: z.object({
      sessionId: z.string().uuid(),
      status: z.string(),
      startedAt: z.string(),
      lastMessageAt: z.string().nullable(),
      messageCount: z.number().int().nonnegative(),
      tokenUsage: z.object({
        promptTokens: z.number().int().nonnegative(),
        completionTokens: z.number().int().nonnegative(),
        totalTokens: z.number().int().nonnegative(),
      }).nullable(),
    }),
    messages: z.array(
      z.object({
        messageId: z.string(),
        role: z.enum(["user", "assistant"]),
        sequenceNo: z.number().int().positive(),
        contentText: z.string().nullable(),
        createdAt: z.string(),
        tokenUsage: z.object({
          promptTokens: z.number().int().nonnegative(),
          completionTokens: z.number().int().nonnegative(),
          totalTokens: z.number().int().nonnegative(),
        }).nullable(),
      }),
    ),
  })
  .openapi("AdminLearningPathSessionDetailResponseData")

export const adminLearningMaterialPlanSnapshotSchema = z
  .object({
    draftId: z.string().uuid(),
    intakeId: z.string().uuid(),
    title: z.string(),
    draftStatus: z.enum(["draft", "confirmed", "rejected", "superseded"]),
    revisionNo: z.number().int().nonnegative(),
    qualityStatus: z.string(),
    qualityReport: learningPlanDraftQualityReportSchema.nullable(),
    updatedAt: z.string(),
    sources: z.array(
      z.object({
        sourceId: z.string().uuid(),
        url: z.string(),
        sourceType: z.string(),
        title: z.string().nullable(),
        contentExcerpt: z.string().nullable(),
        warnings: z.array(z.string()),
        extractionTrace: z.array(
          z.object({
            stage: z.enum(["raw_text", "subtitle", "asr", "ocr", "vision"]),
            attempted: z.boolean(),
            used: z.boolean(),
            reason: z.string(),
            producedChars: z.number().int().nonnegative(),
          }),
        ),
        evidenceCoverage: z.object({
          highConfidenceChars: z.number().int().nonnegative(),
          totalUsefulChars: z.number().int().nonnegative(),
          chunkCount: z.number().int().nonnegative(),
          isSufficient: z.boolean(),
          isWeakEvidence: z.boolean(),
        }).nullable(),
        resolvedModelCodes: z.object({
          asr: z.string().nullable(),
          vision: z.string().nullable(),
          quality: z.string().nullable(),
        }).nullable(),
      }),
    ),
  })
  .openapi("AdminLearningMaterialPlanSnapshot")

export const adminLearningPathDetailResponseDataSchema = z
  .object({
    pathId: z.string().uuid(),
    user: z.object({
      userId: z.string().uuid(),
      nickname: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      email: z.string().nullable(),
      currentScore: z.number().int().nonnegative(),
      currentRankLabel: z.string(),
      streakDays: z.number().int().nonnegative(),
      lastLearningAt: z.string().nullable(),
    }),
    path: z.object({
      pathCode: z.string(),
      pathName: z.string(),
      summary: z.string().nullable(),
      toolCode: z.string(),
      toolName: z.string(),
      learningLevel: learningLevelSchema,
      learningLevelLabel: z.string(),
      selectionMode: selectionModeSchema,
      selectionModeLabel: z.string(),
      status: adminLearningPathStatusSchema,
      totalSteps: z.number().int().nonnegative(),
      completedSteps: z.number().int().nonnegative(),
      progressPercent: z.number().int().min(0).max(100),
      totalTaskCount: z.number().int().nonnegative(),
      completedTaskCount: z.number().int().nonnegative(),
      inProgressTaskCount: z.number().int().nonnegative(),
      blockedTaskCount: z.number().int().nonnegative(),
      pendingTaskCount: z.number().int().nonnegative(),
      xpEarned: z.number().int().nonnegative(),
    }),
    timeline: adminLearningPathTimelineSchema,
    steps: z.array(adminLearningPathDetailStepSchema),
    recentSessions: z.array(adminLearningPathRecentSessionSchema),
    materialPlan: adminLearningMaterialPlanSnapshotSchema.nullable(),
  })
  .openapi("AdminLearningPathDetailResponseData")

export const adminUpdateLearningPathStatusRequestSchema = z
  .object({
    action: z.enum(["reactivate", "archive"]),
    reason: z.string().nullable().optional(),
  })
  .openapi("AdminUpdateLearningPathStatusRequest")

export const adminUpdateLearningPathStatusResponseDataSchema = z
  .object({
    pathId: z.string().uuid(),
    status: adminLearningPathStatusSchema,
  })
  .openapi("AdminUpdateLearningPathStatusResponseData")

export const adminAIProviderTypeSchema = z.enum(ADMIN_AI_PROVIDER_TYPES).openapi("AdminAIProviderType")

export const adminAIAuthModeSchema = z.enum(ADMIN_AI_AUTH_MODES).openapi("AdminAIAuthMode")

export const adminAIAgentScenarioTypeSchema = z
  .enum(ADMIN_AI_AGENT_SCENARIO_TYPES)
  .openapi("AdminAIAgentScenarioType")

export const adminAISkillSourceTypeSchema = z
  .enum(ADMIN_AI_SKILL_SOURCE_TYPES)
  .openapi("AdminAISkillSourceType")

export const adminAISkillTrustLevelSchema = z
  .enum(ADMIN_AI_SKILL_TRUST_LEVELS)
  .openapi("AdminAISkillTrustLevel")

export const adminAIInvocationStatusSchema = z
  .enum(ADMIN_AI_INVOCATION_STATUSES)
  .openapi("AdminAIInvocationStatus")

export const adminAIActiveStatusOptionSchema = z
  .enum(ADMIN_AI_ACTIVE_STATUS_OPTIONS)
  .openapi("AdminAIActiveStatusOption")

export const adminAIInvocationStatusOptionSchema = z
  .enum(ADMIN_AI_INVOCATION_STATUS_OPTIONS)
  .openapi("AdminAIInvocationStatusOption")

export const adminAIInvocationDateRangeSchema = z
  .enum(ADMIN_AI_INVOCATION_DATE_RANGES)
  .openapi("AdminAIInvocationDateRange")

export const adminAIMediaTranscriptionTypeSchema = z
  .enum(ADMIN_AI_MEDIA_TRANSCRIPTION_TYPES)
  .openapi("AdminAIMediaTranscriptionType")

export const adminAIMediaAttachmentKindFilterSchema = z
  .enum(ADMIN_AI_MEDIA_ATTACHMENT_KINDS)
  .openapi("AdminAIMediaAttachmentKindFilter")

export const adminAIPermissionsSchema = z
  .object({
    canView: z.boolean(),
    canManage: z.boolean(),
  })
  .openapi("AdminAIPermissions")

export const adminAIOverviewTopAgentSchema = z
  .object({
    agentCode: z.string(),
    agentName: z.string(),
    invocationCount: z.number().int().nonnegative(),
    failedInvocationCount: z.number().int().nonnegative(),
  })
  .openapi("AdminAIOverviewTopAgent")

export const adminAIOverviewRecentFailureSchema = z
  .object({
    invocationId: z.string().uuid(),
    agentCode: z.string(),
    providerCode: z.string(),
    modelCode: z.string(),
    errorMessage: nullableStringSchema,
    createdAt: z.string(),
  })
  .openapi("AdminAIOverviewRecentFailure")

export const adminAIOverviewResponseDataSchema = z
  .object({
    permissions: adminAIPermissionsSchema,
    stats: z.object({
      totalProviders: z.number().int().nonnegative(),
      activeProviders: z.number().int().nonnegative(),
      totalModels: z.number().int().nonnegative(),
      activeModels: z.number().int().nonnegative(),
      totalAgents: z.number().int().nonnegative(),
      activeAgents: z.number().int().nonnegative(),
      totalSkills: z.number().int().nonnegative(),
      activeSkills: z.number().int().nonnegative(),
      invocationCountLast7Days: z.number().int().nonnegative(),
      failedInvocationCountLast7Days: z.number().int().nonnegative(),
      successRateLast7Days: z.number().min(0).max(1),
    }),
    topAgents: z.array(adminAIOverviewTopAgentSchema),
    recentFailures: z.array(adminAIOverviewRecentFailureSchema),
  })
  .openapi("AdminAIOverviewResponseData")

export const adminAIQuerySchema = z
  .object({
    keyword: z.string().optional(),
    interactionType: z.string().optional(),
    toolId: z.string().optional(),
    selectionMode: z.enum(["self_directed", "preset_training"]).optional(),
    page: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
  })
  .openapi("AdminAIQuery")

export const adminAIListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    status: adminAIActiveStatusOptionSchema.optional(),
    page: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
    /** 若提供则返回单条 Model 详情（与 GET /api/admin/ai/models/{modelId} 等价），勿与列表筛选参数混用。 */
    modelId: z.string().optional(),
  })
  .openapi("AdminAIListQuery")

export const adminAIAgentListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    scenarioType: adminAIAgentScenarioTypeSchema.optional(),
    status: adminAIActiveStatusOptionSchema.optional(),
    page: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
  })
  .openapi("AdminAIAgentListQuery")

export const adminAIInvocationListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    status: adminAIInvocationStatusOptionSchema.optional(),
    providerCode: z.string().optional(),
    modelCode: z.string().optional(),
    agentCode: z.string().optional(),
    dateRange: adminAIInvocationDateRangeSchema.optional(),
    page: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
  })
  .openapi("AdminAIInvocationListQuery")

export const adminAIMediaAttachmentListQuerySchema = z
  .object({
    kind: adminAIMediaAttachmentKindFilterSchema.optional(),
    dateRange: adminAIInvocationDateRangeSchema.optional(),
    page: paginationPositiveIntSchema.optional(),
    limit: paginationPositiveIntSchema.optional(),
  })
  .openapi("AdminAIMediaAttachmentListQuery")

export const adminAIMediaTranscriptionSettingIdParamsSchema = z
  .object({
    settingId: z.string().min(1),
  })
  .openapi("AdminAIMediaTranscriptionSettingIdParams")

export const adminAIProviderIdParamsSchema = z
  .object({
    providerId: z.string().uuid(),
  })
  .openapi("AdminAIProviderIdParams")

export const adminAIModelIdParamsSchema = z
  .object({
    modelId: z.string().uuid(),
  })
  .openapi("AdminAIModelIdParams")

export const adminAIAgentIdParamsSchema = z
  .object({
    agentId: z.string().uuid(),
  })
  .openapi("AdminAIAgentIdParams")

export const adminAIBindingIdParamsSchema = z
  .object({
    bindingId: z.string().uuid(),
  })
  .openapi("AdminAIBindingIdParams")

export const adminAIInvocationIdParamsSchema = z
  .object({
    invocationId: z.string().uuid(),
  })
  .openapi("AdminAIInvocationIdParams")

export const adminAIJsonRecordSchema = z.record(z.unknown()).openapi("AdminAIJsonRecord")

export const adminAIProviderListItemSchema = z
  .object({
    providerId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    providerType: adminAIProviderTypeSchema,
    baseUrl: z.string(),
    authMode: adminAIAuthModeSchema,
    secretSource: z.enum(["database", "env_fallback", "missing"]),
    secretMasked: z.string(),
    envSecretRef: z.string().nullable(),
    hasStoredSecret: z.boolean(),
    supportsStream: z.boolean(),
    supportsJsonMode: z.boolean(),
    timeoutMs: z.number().int().positive(),
    retryCount: z.number().int().positive(),
    isActive: z.boolean(),
    modelCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIProviderListItem")

export const adminAIProviderListResponseDataSchema = z
  .object({
    items: z.array(adminAIProviderListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminAIProviderListResponseData")

export const adminAIProviderDetailSchema = adminAIProviderListItemSchema
  .omit({
    modelCount: true,
  })
  .extend({
    metadata: adminAIJsonRecordSchema,
  })
  .openapi("AdminAIProviderDetail")

export const adminAIProviderDetailResponseDataSchema = z
  .object({
    provider: adminAIProviderDetailSchema,
    linkedModelCodes: z.array(z.string()),
    linkedAgentCodes: z.array(z.string()),
  })
  .openapi("AdminAIProviderDetailResponseData")

export const adminAIProviderUpsertRequestSchema = z
  .object({
    code: z.string().min(2).max(64),
    name: z.string().min(2).max(128),
    providerType: adminAIProviderTypeSchema,
    baseUrl: z.string().url(),
    authMode: adminAIAuthModeSchema,
    envSecretRef: z.string().min(1).max(128).nullable(),
    apiKey: z.string().min(1).max(1000).nullable(),
    keepExistingSecret: z.boolean(),
    supportsStream: z.boolean(),
    supportsJsonMode: z.boolean(),
    timeoutMs: z.number().int().min(1000).max(300000),
    retryCount: z.number().int().min(1).max(10),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAIProviderUpsertRequest")

export const adminAIProviderSecretRevealResponseDataSchema = z
  .object({
    apiKey: z.string(),
    source: z.enum(["database", "env_fallback", "missing"]),
  })
  .openapi("AdminAIProviderSecretRevealResponseData")

export const adminAIProviderTestConnectionRequestSchema = z
  .object({
    baseUrl: z.string().min(8).max(500),
    authMode: adminAIAuthModeSchema,
    providerType: adminAIProviderTypeSchema,
    envSecretRef: z.union([z.string().min(1).max(128), z.null()]),
    apiKey: z.union([z.string().min(1).max(1000), z.null()]),
    timeoutMs: z.number().int().min(1000).max(300_000),
  })
  .openapi("AdminAIProviderTestConnectionRequest")

export const adminAIProviderTestConnectionResponseDataSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    httpStatus: z.number().int().optional(),
    testedPath: z.string().optional(),
  })
  .openapi("AdminAIProviderTestConnectionResponseData")

export const adminAIModelFamilySchema = z
  .enum(ADMIN_AI_MODEL_FAMILIES)
  .openapi("AdminAIModelFamily")

export const adminAIModelRuntimeCapabilitySchema = z
  .enum(ADMIN_AI_MODEL_RUNTIME_CAPABILITIES)
  .openapi("AdminAIModelRuntimeCapability")

export const adminAIModelConnectionTestModeSchema = z
  .enum(ADMIN_AI_MODEL_CONNECTION_TEST_MODES)
  .openapi("AdminAIModelConnectionTestMode")

export const adminAIModelListItemSchema = z
  .object({
    modelId: z.string().uuid(),
    providerId: z.string().uuid(),
    providerCode: z.string(),
    providerName: z.string(),
    code: z.string(),
    displayName: z.string(),
    modelName: z.string(),
    supportsStream: z.boolean(),
    supportsJsonMode: z.boolean(),
    supportsToolCalling: z.boolean(),
    maxContextTokens: z.number().int().positive(),
    defaultMaxOutputTokens: z.number().int().positive(),
    recommendedTemperature: z.number().nullable(),
    modelFamily: adminAIModelFamilySchema,
    runtimeCapabilities: z.array(adminAIModelRuntimeCapabilitySchema),
    connectionTestMode: adminAIModelConnectionTestModeSchema,
    reasoningEnabled: z.boolean(),
    profileGroup: z.string().nullable(),
    notes: z.string().nullable(),
    isActive: z.boolean(),
    linkedAgentCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIModelListItem")

export const adminAIModelListResponseDataSchema = z
  .object({
    items: z.array(adminAIModelListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminAIModelListResponseData")

export const adminAIModelDetailSchema = adminAIModelListItemSchema
  .omit({
    linkedAgentCount: true,
  })
  .extend({
    pricingMetadata: adminAIJsonRecordSchema,
    metadata: adminAIJsonRecordSchema,
  })
  .openapi("AdminAIModelDetail")

export const adminAIModelDetailResponseDataSchema = z
  .object({
    model: adminAIModelDetailSchema,
    linkedAgentCodes: z.array(z.string()),
  })
  .openapi("AdminAIModelDetailResponseData")

export const adminAIModelUpsertRequestSchema = z
  .object({
    providerCode: z.string().min(2).max(64),
    code: z.string().min(2).max(64),
    displayName: z.string().min(2).max(128),
    modelName: z.string().min(2).max(256),
    supportsStream: z.boolean(),
    supportsJsonMode: z.boolean(),
    supportsToolCalling: z.boolean(),
    maxContextTokens: z.number().int().min(256).max(10000000),
    defaultMaxOutputTokens: z.number().int().min(1).max(1000000),
    recommendedTemperature: z.number().min(0).max(2).nullable(),
    modelFamily: adminAIModelFamilySchema,
    runtimeCapabilities: z.array(adminAIModelRuntimeCapabilitySchema),
    connectionTestMode: adminAIModelConnectionTestModeSchema,
    reasoningEnabled: z.boolean(),
    profileGroup: z.string().max(128).nullable(),
    notes: z.string().max(2000).nullable(),
    pricingMetadata: adminAIJsonRecordSchema,
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAIModelUpsertRequest")

export const adminAIModelTestConnectionRequestSchema = z
  .object({
    providerCode: z.string().min(1).max(64),
    modelName: z.string().min(1).max(256),
    modelFamily: adminAIModelFamilySchema.optional(),
    runtimeCapabilities: z.array(adminAIModelRuntimeCapabilitySchema).optional(),
    connectionTestMode: z.union([
      adminAIModelConnectionTestModeSchema,
      z.literal("audio_transcription"),
    ]).optional(),
    maxOutputTokens: z.number().int().min(1).max(512).optional(),
    timeoutMs: z.number().int().min(1000).max(300_000).optional(),
  })
  .openapi("AdminAIModelTestConnectionRequest")

export const adminAIModelTestConnectionResponseDataSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    httpStatus: z.number().int().optional(),
    testedPath: z.string().optional(),
  })
  .openapi("AdminAIModelTestConnectionResponseData")

export const adminAIMediaModelOptionSchema = z
  .object({
    modelId: z.string().uuid(),
    code: z.string(),
    displayName: z.string(),
    modelName: z.string(),
    providerCode: z.string(),
    providerName: z.string(),
    runtimeCapabilities: z.array(adminAIModelRuntimeCapabilitySchema),
    isActive: z.boolean(),
  })
  .openapi("AdminAIMediaModelOption")

export const adminAIMediaTranscriptionSettingItemSchema = z
  .object({
    settingId: z.string().uuid(),
    mediaType: adminAIMediaTranscriptionTypeSchema,
    label: z.string(),
    description: z.string(),
    requiredCapability: adminAIModelRuntimeCapabilitySchema.nullable(),
    modelId: z.string().uuid().nullable(),
    modelCode: z.string().nullable(),
    modelDisplayName: z.string().nullable(),
    providerCode: z.string().nullable(),
    providerName: z.string().nullable(),
    isEnabled: z.boolean(),
    version: z.number().int().positive(),
    metadata: adminAIJsonRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIMediaTranscriptionSettingItem")

export const adminAIMediaTranscriptionSettingsResponseDataSchema = z
  .object({
    items: z.array(adminAIMediaTranscriptionSettingItemSchema),
    modelOptions: z.array(adminAIMediaModelOptionSchema),
  })
  .openapi("AdminAIMediaTranscriptionSettingsResponseData")

export const adminAIMediaTranscriptionSettingUpdateRequestSchema = z
  .object({
    modelId: z.string().uuid().nullable(),
    isEnabled: z.boolean(),
    version: z.number().int().positive().optional(),
    changeReason: z.string().min(1).max(200),
  })
  .openapi("AdminAIMediaTranscriptionSettingUpdateRequest")

export const adminAIMediaTranscriptionSettingUpdateResponseDataSchema = z
  .object({
    setting: adminAIMediaTranscriptionSettingItemSchema,
  })
  .openapi("AdminAIMediaTranscriptionSettingUpdateResponseData")

export const adminAIMediaAttachmentListItemSchema = z
  .object({
    attachmentId: z.string().uuid(),
    userId: z.string().uuid(),
    sessionId: z.string().uuid().nullable(),
    messageId: z.string().uuid().nullable(),
    kind: z.enum(["image", "audio"]),
    processingStatus: z.enum(["pending", "processing", "completed", "failed"]),
    previewUrl: z.string().url().nullable(),
    originalFilename: z.string().nullable(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
    durationMs: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    extractedText: z.string().nullable(),
    visualSummary: z.string().nullable(),
    transcriptText: z.string().nullable(),
    errorMessage: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIMediaAttachmentListItem")

export const adminAIMediaAttachmentListResponseDataSchema = z
  .object({
    items: z.array(adminAIMediaAttachmentListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminAIMediaAttachmentListResponseData")

export const adminAIAgentBindingListItemSchema = z
  .object({
    bindingId: z.string().uuid(),
    agentCode: z.string(),
    agentName: z.string(),
    toolId: z.string().uuid().nullable(),
    toolCode: nullableStringSchema,
    toolName: nullableStringSchema,
    learningLevel: learningLevelSchema.nullable(),
    selectionMode: selectionModeSchema.nullable(),
    pathId: z.string().uuid().nullable(),
    pathCode: nullableStringSchema,
    pathName: nullableStringSchema,
    stepNo: z.number().int().positive().nullable(),
    interactionType: z.string(),
    priority: z.number().int().positive(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIAgentBindingListItem")

export const adminAICodeNameOptionSchema = z
  .object({
    code: z.string(),
    name: z.string(),
  })
  .openapi("AdminAICodeNameOption")

export const adminAIToolOptionSchema = z
  .object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  })
  .openapi("AdminAIToolOption")

export const adminAIPathOptionSchema = z
  .object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  })
  .openapi("AdminAIPathOption")

export const adminAIAgentBindingListResponseDataSchema = z
  .object({
    items: z.array(adminAIAgentBindingListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    agentOptions: z.array(adminAICodeNameOptionSchema).optional(),
    toolOptions: z.array(adminAIToolOptionSchema).optional(),
    pathOptions: z.array(adminAIPathOptionSchema).optional(),
  })
  .openapi("AdminAIAgentBindingListResponseData")

export const adminAIAgentDetailSchema = z
  .object({
    agentId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    scenarioType: adminAIAgentScenarioTypeSchema,
    description: nullableStringSchema,
    systemPromptTemplate: z.string(),
    developerPromptTemplate: nullableStringSchema,
    defaultProviderCode: z.string(),
    defaultModelCode: z.string(),
    contextMessageLimit: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    temperature: z.number(),
    topP: z.number().nullable(),
    streamEnabled: z.boolean(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    version: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIAgentDetail")

export const adminAIAgentListItemSchema = z
  .object({
    agentId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    scenarioType: adminAIAgentScenarioTypeSchema,
    providerCode: z.string(),
    modelCode: z.string(),
    streamEnabled: z.boolean(),
    isActive: z.boolean(),
    bindingCount: z.number().int().nonnegative(),
    skillCount: z.number().int().nonnegative(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIAgentListItem")

export const adminAIAgentListResponseDataSchema = z
  .object({
    items: z.array(adminAIAgentListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminAIAgentListResponseData")

export const adminAISkillListItemSchema = z
  .object({
    skillId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    version: z.string(),
    sourceType: adminAISkillSourceTypeSchema,
    trustLevel: adminAISkillTrustLevelSchema,
    rootPath: z.string(),
    manifestPath: z.string(),
    entryResourcePath: nullableStringSchema,
    scriptsEnabled: z.boolean(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    linkedAgentCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAISkillListItem")

export const adminAISkillListResponseDataSchema = z
  .object({
    items: z.array(adminAISkillListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .openapi("AdminAISkillListResponseData")

export const adminAIAgentSkillBindingListItemSchema = z
  .object({
    bindingId: z.string().uuid(),
    agentCode: z.string(),
    agentName: z.string(),
    skillCode: z.string(),
    skillName: z.string(),
    priority: z.number().int().positive(),
    isRequired: z.boolean(),
    contextBudgetTokens: z.number().int().positive().nullable(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AdminAIAgentSkillBindingListItem")

export const adminAIAgentSkillBindingListResponseDataSchema = z
  .object({
    items: z.array(adminAIAgentSkillBindingListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    agentOptions: z.array(adminAICodeNameOptionSchema).optional(),
    skillOptions: z.array(adminAICodeNameOptionSchema).optional(),
  })
  .openapi("AdminAIAgentSkillBindingListResponseData")

export const adminAIAgentDetailResponseDataSchema = z
  .object({
    agent: adminAIAgentDetailSchema,
    bindings: z.array(adminAIAgentBindingListItemSchema),
    skillBindings: z.array(adminAIAgentSkillBindingListItemSchema),
  })
  .openapi("AdminAIAgentDetailResponseData")

export const adminAIAgentUpsertRequestSchema = z
  .object({
    code: z.string().min(2).max(64),
    name: z.string().min(2).max(128),
    scenarioType: adminAIAgentScenarioTypeSchema,
    description: z.string().nullable(),
    systemPromptTemplate: z.string().min(10).max(50000),
    developerPromptTemplate: z.string().nullable(),
    defaultProviderCode: z.string().min(2).max(64),
    defaultModelCode: z.string().min(2).max(64),
    contextMessageLimit: z.number().int().min(1).max(100),
    maxOutputTokens: z.number().int().min(1).max(100000),
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1).nullable(),
    streamEnabled: z.boolean(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAIAgentUpsertRequest")

export const adminAIAgentBindingUpsertRequestSchema = z
  .object({
    agentCode: z.string().min(2).max(64),
    toolId: z.string().uuid().nullable(),
    learningLevel: learningLevelSchema.nullable(),
    selectionMode: selectionModeSchema.nullable(),
    pathId: z.string().uuid().nullable(),
    stepNo: z.number().int().min(1).max(10000).nullable(),
    interactionType: z.string().min(2).max(32),
    priority: z.number().int().min(1).max(1000),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAIAgentBindingUpsertRequest")

export const adminAIAgentSkillBindingUpsertRequestSchema = z
  .object({
    agentCode: z.string().min(2).max(64),
    skillCode: z.string().min(2).max(64),
    priority: z.number().int().min(1).max(1000),
    isRequired: z.boolean(),
    contextBudgetTokens: z.number().int().min(1).max(100000).nullable(),
    isActive: z.boolean(),
    metadata: adminAIJsonRecordSchema,
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAIAgentSkillBindingUpsertRequest")

export const adminAIInvocationListItemSchema = z
  .object({
    invocationId: z.string().uuid(),
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    providerCode: z.string(),
    modelCode: z.string(),
    agentCode: z.string(),
    status: adminAIInvocationStatusSchema,
    streamEnabled: z.boolean(),
    totalTokens: z.number().int().nullable(),
    latencyMs: z.number().int().nullable(),
    finishReason: nullableStringSchema,
    errorCode: nullableStringSchema,
    createdAt: z.string(),
  })
  .openapi("AdminAIInvocationListItem")

export const adminAIInvocationListResponseDataSchema = z
  .object({
    items: z.array(adminAIInvocationListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    providerOptions: z.array(adminAICodeNameOptionSchema).optional(),
    modelOptions: z.array(adminAICodeNameOptionSchema).optional(),
    agentOptions: z.array(adminAICodeNameOptionSchema).optional(),
  })
  .openapi("AdminAIInvocationListResponseData")

export const adminAIInvocationDetailResponseDataSchema = z
  .object({
    invocation: z.object({
      invocationId: z.string().uuid(),
      sessionId: z.string().uuid(),
      assistantMessageId: nullableStringSchema,
      userMessageId: nullableStringSchema,
      userId: z.string().uuid(),
      providerCode: z.string(),
      modelCode: z.string(),
      agentCode: z.string(),
      status: adminAIInvocationStatusSchema,
      streamEnabled: z.boolean(),
      promptTokens: z.number().int().nullable(),
      completionTokens: z.number().int().nullable(),
      totalTokens: z.number().int().nullable(),
      latencyMs: z.number().int().nullable(),
      firstChunkLatencyMs: z.number().int().nullable(),
      finishReason: nullableStringSchema,
      errorCode: nullableStringSchema,
      errorMessage: nullableStringSchema,
      requestPayloadRedacted: adminAIJsonRecordSchema,
      responsePayloadRedacted: adminAIJsonRecordSchema,
      createdAt: z.string(),
    }),
  })
  .openapi("AdminAIInvocationDetailResponseData")

export const adminAIResolvePreviewRequestSchema = z
  .object({
    interactionType: z.string().min(2).max(32),
    toolId: z.string().uuid().nullable(),
    learningLevel: learningLevelSchema.nullable(),
    selectionMode: selectionModeSchema.nullable(),
    pathId: z.string().uuid().nullable(),
    stepNo: z.number().int().min(1).max(10000).nullable(),
  })
  .openapi("AdminAIResolvePreviewRequest")

export const adminAIResolvePreviewResponseDataSchema = z
  .object({
    matchedBinding: z.object({
      bindingId: z.string().uuid(),
      agentCode: z.string(),
      priority: z.number().int().positive(),
      specificityScore: z.number(),
    }).nullable(),
    agent: z.object({
      code: z.string(),
      name: z.string(),
      providerCode: z.string(),
      modelCode: z.string(),
    }).nullable(),
    matchedSkills: z.array(z.object({
      bindingId: z.string().uuid(),
      skillCode: z.string(),
      skillName: z.string(),
      priority: z.number().int().positive(),
    })),
  })
  .openapi("AdminAIResolvePreviewResponseData")

export const adminAITestRequestSchema = z
  .object({
    agentCode: z.string().min(2).max(64),
    providerCode: z.string().min(2).max(64),
    modelCode: z.string().min(2).max(64),
    prompt: z.string().min(2).max(20000),
    stream: z.boolean(),
    changeReason: z.string().min(2).max(200),
  })
  .openapi("AdminAITestRequest")

export const adminAITestResponseDataSchema = z
  .object({
    invocationId: z.string().uuid(),
    providerCode: z.string(),
    modelCode: z.string(),
    agentCode: z.string(),
    status: z.enum(["succeeded", "failed", "timed_out"]),
    content: z.string(),
    finishReason: nullableStringSchema,
    usage: z.object({
      promptTokens: z.number().int().nonnegative(),
      completionTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    }),
    latencyMs: z.number().int().nullable(),
    requestPayloadRedacted: adminAIJsonRecordSchema,
    responsePayloadRedacted: adminAIJsonRecordSchema,
  })
  .openapi("AdminAITestResponseData")
