import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"
import { z } from "zod"
import { FEEDBACK_PRIORITIES, FEEDBACK_REPLY_AUTHOR_TYPES, FEEDBACK_STATUSES, FEEDBACK_SOURCES, FEEDBACK_TYPES } from "@/lib/api/contracts/feedback"
import { ADMIN_ACCOUNT_STATUSES, ADMIN_ROLE_CODES } from "@/lib/api/contracts/admin"

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
    "MATERIAL_UNSUPPORTED_DOMAIN",
    "MATERIAL_FETCH_FAILED",
    "MATERIAL_INSUFFICIENT_CONTENT",
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
    loginType: z.enum(["phone", "wechat"]),
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
    type: z.literal("image"),
    url: z.string(),
    name: z.string(),
  })
  .openapi("MessageAttachment")

export const messageSchema = z
  .object({
    id: z.number().int(),
    role: z.enum(["system", "ai", "user"]),
    kind: z.enum(["system_goal", "coach", "user_input", "task_feedback"]),
    title: z.string().optional(),
    content: z.string(),
    structuredContent: structuredLearningMessageContentSchema.nullable().optional(),
    taskPatch: messageTaskPatchSchema.nullable().optional(),
    xp: z.number().optional(),
    nextStep: z.string().optional(),
    attachment: messageAttachmentSchema.optional(),
  })
  .openapi("Message")

export const learningMessageRequestSchema = z
  .object({
    conversationId: z.string().nullable().optional(),
    taskId: z.string().optional(),
    clientMessageId: z.string().optional(),
    interactionType: learningInteractionTypeSchema.optional(),
    inputType: learningInputTypeSchema,
    content: z.string(),
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

export const learningPlanPreviewTaskSchema = z
  .object({
    taskNo: z.number().int(),
    title: z.string(),
    objective: z.string(),
    practiceSteps: z.array(z.string()),
    acceptanceCriteria: z.string(),
    estimatedMinutes: z.number().int().optional(),
    sourceRefs: z.array(z.string()),
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
  })
  .openapi("LearningPlanFromMaterialRequest")

export const learningPlanFromMaterialResponseDataSchema = z
  .object({
    processingMode: z.literal("sync"),
    draftId: z.string().uuid(),
    intakeId: z.string().uuid(),
    preview: learningPlanPreviewSchema,
  })
  .openapi("LearningPlanFromMaterialResponseData")

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

export const learningCautionItemSchema = z
  .object({
    text: z.string(),
    isTrap: z.boolean().optional(),
  })
  .openapi("LearningCautionItem")

export const learningTipSchema = z
  .object({
    title: z.string(),
    body: z.string(),
  })
  .openapi("LearningTip")

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
  })
  .openapi("LearningMission")

export const learningCurrentSessionResponseDataSchema = z
  .object({
    conversationId: z.string().nullable(),
    historyPagination: learningHistoryPaginationSchema,
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
      nextStepPreview: z.string(),
    }),
    recentPracticeRounds: z.array(recentPracticeRoundSchema),
    tasks: z.array(learningTaskSchema),
    knowledgeTags: z.array(learningKnowledgeTagSchema),
    tips: z.array(learningTipSchema),
  })
  .openapi("LearningCurrentSessionResponseData")

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

// ============================================
// 管理员看板 API Schemas
// ============================================

export const adminDashboardOverviewResponseDataSchema = z
  .object({
    pendingFeedbackCount: z.number().int().nonnegative(),
    todayNewUserCount: z.number().int().nonnegative(),
    todayCompletedTaskCount: z.number().int().nonnegative(),
    activeLearningPathCount: z.number().int().nonnegative(),
    todayCheckinCount: z.number().int().nonnegative(),
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
    latestAssistantSummary: z.string().nullable(),
  })
  .openapi("AdminLearningPathRecentSession")

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
