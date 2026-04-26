import { z } from "zod"
import {
  type AdminFeedbackBatchDeleteRequest,
  FEEDBACK_PRIORITIES,
  FEEDBACK_SOURCES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type AdminReplyFeedbackRequest,
  type AdminUpdateFeedbackStatusRequest,
  type CreateFeedbackRequest,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/api/contracts/feedback"
import type { AuthLoginType } from "@/lib/api/contracts/auth"
import type { AnalyticsTrackEventRequest } from "@/lib/api/contracts/analytics"
import type { UpdateLearningHistoryStatusRequest } from "@/lib/api/contracts/history"
import type { CompleteOnboardingRequest } from "@/lib/api/contracts/onboarding"
import type { UpdateNotificationSettingsRequest } from "@/lib/api/contracts/notifications"
import type { CompleteTaskRequest, UpdateTaskStatusRequest } from "@/lib/api/contracts/task"
import type { AdminUpdateUserRequest } from "@/lib/api/contracts/admin-users"
import {
  ADMIN_LEARNING_PATH_LIST_STATUSES,
  ADMIN_LEARNING_PATH_STATUS_ACTIONS,
  ADMIN_LEARNING_UPDATED_WITHIN_OPTIONS,
  type AdminLearningPathListStatus,
  type AdminLearningPathStatusAction,
  type AdminLearningUpdatedWithin,
} from "@/lib/api/contracts/admin-learning"
import {
  ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES,
  ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS,
  ADMIN_SETTINGS_AUDIT_TARGET_TYPES,
  type AdminSettingsAccountListStatus,
  type AdminSettingsAccountStatusAction,
  type AdminSettingsAuditTargetType,
  type ContactChannelConfig,
  type AdminUpdateAdminAccountStatusRequest,
  type UpdateSiteContactRequest,
} from "@/lib/api/contracts/admin-settings"
import {
  ADMIN_AI_ACTIVE_STATUS_OPTIONS,
  ADMIN_AI_AGENT_SCENARIO_TYPES,
  ADMIN_AI_AUTH_MODES,
  ADMIN_AI_MODEL_CONNECTION_TEST_MODES,
  ADMIN_AI_MODEL_FAMILIES,
  ADMIN_AI_MODEL_RUNTIME_CAPABILITIES,
  ADMIN_AI_INVOCATION_DATE_RANGES,
  ADMIN_AI_INVOCATION_STATUS_OPTIONS,
  ADMIN_AI_PROVIDER_TYPES,
  type AdminAIModelConnectionTestMode,
  type AdminAIModelFamily,
  type AdminAIModelRuntimeCapability,
  type AdminAIAgentScenarioType,
  type AdminAIAgentUpsertRequest,
  type AdminAIAgentBindingUpsertRequest,
  type AdminAIAgentSkillBindingUpsertRequest,
  type AdminAIInvocationDateRange,
  type AdminAIInvocationStatusOption,
  type AdminAIModelUpsertRequest,
  type AdminAIModelTestConnectionRequest,
  type AdminAIProviderTestConnectionRequest,
  type AdminAIProviderUpsertRequest,
  type AdminAIResolvePreviewRequest,
  type AdminAITestRequest,
} from "@/lib/api/contracts/admin-ai"
import { isUuid, normalizeUuid } from "@/server/lib/identifiers"
import type { HistoryFilter } from "@/features/history/types"
import type { Level } from "@/features/onboarding/types"
import { PROFILE_AVATAR_ALLOWED_TYPES, PROFILE_AVATAR_MAX_BYTES } from "@/lib/supabase/storage"
import { APP_EVENTS } from "@/constants/events"

type ValidationSuccess<T> = {
  ok: true
  data: T
}

type ValidationFailure = {
  ok: false
  code: string
  message: string
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

function ok<T>(data: T): ValidationSuccess<T> {
  return {
    ok: true,
    data,
  }
}

function fail(
  code: ValidationFailure["code"],
  message: string,
): ValidationFailure {
  return {
    ok: false,
    code,
    message,
  }
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

const authLoginBodyShapeSchema = z.object({
  loginType: z.string(),
})

export function parseAuthLoginBody(input: unknown): ValidationResult<{
  loginType: AuthLoginType
}> {
  const shape = authLoginBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "loginType 不合法。")
  }

  if (
    shape.data.loginType !== "phone"
    && shape.data.loginType !== "wechat"
    && shape.data.loginType !== "douyin"
  ) {
    return fail("BAD_REQUEST", "loginType 不合法。")
  }

  return ok({
    loginType: shape.data.loginType as AuthLoginType,
  })
}

const completeOnboardingBodyShapeSchema = z.object({
  toolCode: z.string(),
  learningLevel: z.string(),
  selectionMode: z.string(),
  selectedPathId: z.unknown().optional(),
})

export function parseCompleteOnboardingBody(
  input: unknown,
): ValidationResult<CompleteOnboardingRequest> {
  const shape = completeOnboardingBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "请求体格式不正确。")
  }

  if (
    shape.data.learningLevel !== "beginner"
    && shape.data.learningLevel !== "intermediate"
    && shape.data.learningLevel !== "advanced"
  ) {
    return fail("VALIDATION_FAILED", "learningLevel 或 selectionMode 不合法。")
  }

  if (
    shape.data.selectionMode !== "self_directed"
    && shape.data.selectionMode !== "preset_training"
  ) {
    return fail("VALIDATION_FAILED", "learningLevel 或 selectionMode 不合法。")
  }

  return ok({
    toolCode: shape.data.toolCode,
    learningLevel: shape.data.learningLevel,
    selectionMode: shape.data.selectionMode,
    selectedPathId:
      typeof shape.data.selectedPathId === "string" && shape.data.selectedPathId.trim().length > 0
        ? shape.data.selectedPathId.trim()
        : undefined,
  })
}

const updateProfileBodyShapeSchema = z.object({
  nickname: z.string(),
  avatarUrl: z.unknown().optional(),
  email: z.unknown().optional(),
  wechat: z.unknown().optional(),
  bio: z.unknown().optional(),
})

export function parseUpdateProfileMeBody(input: unknown) {
  const shape = updateProfileBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "个人资料请求体不合法。")
  }

  const data = {
    nickname: shape.data.nickname,
    avatarUrl: normalizeOptionalString(shape.data.avatarUrl),
    email: normalizeOptionalString(shape.data.email),
    wechat: normalizeOptionalString(shape.data.wechat),
    bio: normalizeOptionalString(shape.data.bio),
  }

  const nickname = data.nickname.trim()

  if (nickname.length < 2) {
    return fail("VALIDATION_FAILED", "昵称至少需要 2 个字符。")
  }

  if (nickname.length > 24) {
    return fail("VALIDATION_FAILED", "昵称最多 24 个字符。")
  }

  if (data.avatarUrl && !isValidUrl(data.avatarUrl)) {
    return fail("VALIDATION_FAILED", "头像链接格式不正确，请填写以 http:// 或 https:// 开头的图片地址。")
  }

  if (data.avatarUrl && data.avatarUrl.length > 500) {
    return fail("VALIDATION_FAILED", "头像链接过长，请换一个更短的地址。")
  }

  if (data.wechat && data.wechat.length > 64) {
    return fail("VALIDATION_FAILED", "微信号最多 64 个字符。")
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return fail("VALIDATION_FAILED", "邮箱格式不正确，请检查后重试。")
  }

  if (data.bio && data.bio.length > 300) {
    return fail("VALIDATION_FAILED", "个人简介最多 300 个字符。")
  }

  return ok(data)
}

function parseTimeField(value: unknown, fieldName: string): ValidationResult<string> {
  if (typeof value !== "string") {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是 HH:mm 格式。`)
  }

  const normalized = value.trim()
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是 HH:mm 格式。`)
  }

  return ok(normalized)
}

export function parseAnalyticsTrackEventBody(
  input: unknown,
): ValidationResult<AnalyticsTrackEventRequest> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象。")
  }

  const body = input as Record<string, unknown>

  if (
    typeof body.eventName !== "string"
    || !Object.values(APP_EVENTS).includes(body.eventName as (typeof APP_EVENTS)[keyof typeof APP_EVENTS])
  ) {
    return fail("VALIDATION_FAILED", "eventName 不合法。")
  }

  let pagePath: string | null | undefined
  if (body.pagePath !== undefined) {
    if (body.pagePath !== null && typeof body.pagePath !== "string") {
      return fail("VALIDATION_FAILED", "pagePath 必须是字符串或 null。")
    }

    const normalized = typeof body.pagePath === "string" ? body.pagePath.trim() : ""
    if (normalized.length > 256) {
      return fail("VALIDATION_FAILED", "pagePath 长度不能超过 256 个字符。")
    }
    pagePath = normalized.length > 0 ? normalized : null
  }

  const properties = parseJsonRecord(body.properties, "properties")
  if (!properties.ok) {
    return properties
  }

  let occurredAt: string | null | undefined
  if (body.occurredAt !== undefined) {
    if (body.occurredAt !== null && typeof body.occurredAt !== "string") {
      return fail("VALIDATION_FAILED", "occurredAt 必须是 ISO 8601 时间字符串。")
    }

    if (typeof body.occurredAt === "string" && body.occurredAt.trim().length > 0) {
      const normalized = body.occurredAt.trim()
      if (Number.isNaN(Date.parse(normalized))) {
        return fail("VALIDATION_FAILED", "occurredAt 必须是 ISO 8601 时间字符串。")
      }
      occurredAt = normalized
    } else {
      occurredAt = null
    }
  }

  return ok({
    eventName: body.eventName as AnalyticsTrackEventRequest["eventName"],
    pagePath,
    properties: properties.data,
    occurredAt,
  })
}

export function parseNotificationSettingsBody(
  input: unknown,
): ValidationResult<UpdateNotificationSettingsRequest> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("BAD_REQUEST", "通知设置请求体不合法。")
  }

  const body = input as Record<string, unknown>
  const checkinReminder = parseBooleanField(body.checkinReminder, "checkinReminder")
  if (!checkinReminder.ok) {
    return checkinReminder
  }

  const checkinTime = parseTimeField(body.checkinTime, "checkinTime")
  if (!checkinTime.ok) {
    return checkinTime
  }

  const progressPush = parseBooleanField(body.progressPush, "progressPush")
  if (!progressPush.ok) {
    return progressPush
  }

  if (!body.remindMethods || typeof body.remindMethods !== "object" || Array.isArray(body.remindMethods)) {
    return fail("VALIDATION_FAILED", "remindMethods 必须是对象。")
  }

  const remindMethodsBody = body.remindMethods as Record<string, unknown>
  const app = parseBooleanField(remindMethodsBody.app, "remindMethods.app")
  if (!app.ok) {
    return app
  }
  const email = parseBooleanField(remindMethodsBody.email, "remindMethods.email")
  if (!email.ok) {
    return email
  }
  const wechat = parseBooleanField(remindMethodsBody.wechat, "remindMethods.wechat")
  if (!wechat.ok) {
    return wechat
  }

  const doNotDisturb = parseBooleanField(body.doNotDisturb, "doNotDisturb")
  if (!doNotDisturb.ok) {
    return doNotDisturb
  }

  const doNotDisturbStart = parseTimeField(body.doNotDisturbStart, "doNotDisturbStart")
  if (!doNotDisturbStart.ok) {
    return doNotDisturbStart
  }

  const doNotDisturbEnd = parseTimeField(body.doNotDisturbEnd, "doNotDisturbEnd")
  if (!doNotDisturbEnd.ok) {
    return doNotDisturbEnd
  }

  return ok({
    checkinReminder: checkinReminder.data,
    checkinTime: checkinTime.data,
    progressPush: progressPush.data,
    remindMethods: {
      app: app.data,
      email: email.data,
      wechat: wechat.data,
    },
    doNotDisturb: doNotDisturb.data,
    doNotDisturbStart: doNotDisturbStart.data,
    doNotDisturbEnd: doNotDisturbEnd.data,
  })
}

const createFeedbackBodyShapeSchema = z.object({
  feedbackType: z.string(),
  title: z.string(),
  content: z.string(),
  contactMethod: z.unknown().optional(),
  source: z.unknown().optional(),
})

export function parseCreateFeedbackBody(
  input: unknown,
): ValidationResult<CreateFeedbackRequest> {
  const shape = createFeedbackBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "反馈请求体不合法。")
  }

  if (!FEEDBACK_TYPES.includes(shape.data.feedbackType as (typeof FEEDBACK_TYPES)[number])) {
    return fail("BAD_REQUEST", "反馈请求体不合法。")
  }

  if (
    shape.data.source != null
    && (
      typeof shape.data.source !== "string"
      || !FEEDBACK_SOURCES.includes(shape.data.source as (typeof FEEDBACK_SOURCES)[number])
    )
  ) {
    return fail("BAD_REQUEST", "反馈请求体不合法。")
  }

  const data: CreateFeedbackRequest = {
    feedbackType: shape.data.feedbackType as (typeof FEEDBACK_TYPES)[number],
    title: shape.data.title,
    content: shape.data.content,
    contactMethod: normalizeOptionalString(shape.data.contactMethod),
    source:
      typeof shape.data.source === "string"
        ? (shape.data.source as (typeof FEEDBACK_SOURCES)[number])
        : null,
  }

  if (data.title.trim().length < 4) {
    return fail("VALIDATION_FAILED", "标题至少需要 4 个字符。")
  }

  if (data.title.trim().length > 80) {
    return fail("VALIDATION_FAILED", "标题最多 80 个字符。")
  }

  if (data.content.trim().length < 10) {
    return fail("VALIDATION_FAILED", "反馈内容至少需要 10 个字符。")
  }

  if (data.content.trim().length > 2000) {
    return fail("VALIDATION_FAILED", "反馈内容最多 2000 个字符。")
  }

  if (data.contactMethod && data.contactMethod.trim().length > 120) {
    return fail("VALIDATION_FAILED", "回访联系方式最多 120 个字符。")
  }

  return ok(data)
}

const adminReplyFeedbackBodyShapeSchema = z.object({
  content: z.string(),
  status: z.unknown().optional(),
})

export function parseAdminReplyFeedbackBody(
  input: unknown,
): ValidationResult<AdminReplyFeedbackRequest> {
  const shape = adminReplyFeedbackBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "管理员回复请求体不合法。")
  }

  if (
    shape.data.status != null
    && (
      typeof shape.data.status !== "string"
      || !FEEDBACK_STATUSES.includes(shape.data.status as (typeof FEEDBACK_STATUSES)[number])
    )
  ) {
    return fail("BAD_REQUEST", "管理员回复请求体不合法。")
  }

  const data: AdminReplyFeedbackRequest = {
    content: shape.data.content,
    status:
      typeof shape.data.status === "string"
        ? (shape.data.status as (typeof FEEDBACK_STATUSES)[number])
        : undefined,
  }

  if (data.content.trim().length < 2) {
    return fail("VALIDATION_FAILED", "回复内容至少需要 2 个字符。")
  }

  if (data.content.trim().length > 2000) {
    return fail("VALIDATION_FAILED", "回复内容最多 2000 个字符。")
  }

  return ok(data)
}

const adminUpdateFeedbackStatusBodyShapeSchema = z.object({
  status: z.string(),
})

export function parseAdminUpdateFeedbackStatusBody(
  input: unknown,
): ValidationResult<AdminUpdateFeedbackStatusRequest> {
  const shape = adminUpdateFeedbackStatusBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "管理员状态更新请求体不合法。")
  }

  if (!FEEDBACK_STATUSES.includes(shape.data.status as (typeof FEEDBACK_STATUSES)[number])) {
    return fail("BAD_REQUEST", "管理员状态更新请求体不合法。")
  }

  return ok({
    status: shape.data.status as (typeof FEEDBACK_STATUSES)[number],
  })
}

const adminFeedbackBatchDeleteBodyShapeSchema = z.object({
  ids: z.array(z.unknown()),
})

export function parseAdminFeedbackBatchDeleteBody(
  input: unknown,
): ValidationResult<AdminFeedbackBatchDeleteRequest> {
  const shape = adminFeedbackBatchDeleteBodyShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "管理员批量删除请求体不合法。")
  }

  const ids = shape.data.ids
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)

  if (ids.length === 0) {
    return fail("VALIDATION_FAILED", "至少选择 1 条工单。")
  }

  if (ids.length !== shape.data.ids.length) {
    return fail("VALIDATION_FAILED", "ids 中存在不合法的工单 ID。")
  }

  if (ids.length > 100) {
    return fail("VALIDATION_FAILED", "单次最多只能删除 100 条工单。")
  }

  return ok({
    ids,
  })
}

const completeTaskBodyShapeSchema = z.object({
  taskId: z.string(),
  conversationId: z.unknown().optional(),
})

export function parseCompleteTaskBody(
  input: unknown,
): ValidationResult<CompleteTaskRequest> {
  const shape = completeTaskBodyShapeSchema.safeParse(input)

  if (!shape.success || shape.data.taskId.trim().length === 0) {
    return fail("VALIDATION_FAILED", "taskId 不合法。")
  }

  return ok({
    taskId: shape.data.taskId.trim(),
    conversationId:
      typeof shape.data.conversationId === "string" && shape.data.conversationId.trim().length > 0
        ? shape.data.conversationId.trim()
        : undefined,
  })
}

const updateTaskStatusBodyShapeSchema = z.object({
  taskId: z.string(),
  status: z.string(),
  reason: z.unknown().optional(),
})

export function parseUpdateTaskStatusBody(
  input: unknown,
): ValidationResult<UpdateTaskStatusRequest> {
  const shape = updateTaskStatusBodyShapeSchema.safeParse(input)

  if (
    !shape.success
    || shape.data.taskId.trim().length === 0
    || (shape.data.status !== "in_progress" && shape.data.status !== "blocked")
  ) {
    return fail("VALIDATION_FAILED", "taskId 或 status 不合法。")
  }

  return ok({
    taskId: shape.data.taskId.trim(),
    status: shape.data.status,
    reason:
      typeof shape.data.reason === "string" && shape.data.reason.trim().length > 0
        ? shape.data.reason.trim()
        : null,
  })
}

const updateHistoryStatusBodyShapeSchema = z.object({
  action: z.string(),
})

export function parseUpdateHistoryStatusBody(
  input: unknown,
): ValidationResult<UpdateLearningHistoryStatusRequest> {
  const shape = updateHistoryStatusBodyShapeSchema.safeParse(input)

  if (
    !shape.success
    || (
      shape.data.action !== "abandon"
      && shape.data.action !== "reactivate"
      && shape.data.action !== "archive"
    )
  ) {
    return fail("BAD_REQUEST", "学习计划操作请求体不合法。")
  }

  return ok({
    action: shape.data.action,
  })
}

export function parseLearningMessagesQuery(searchParams: URLSearchParams) {
  const conversationId = normalizeUuid(searchParams.get("conversationId"))

  if (!conversationId) {
    return fail("VALIDATION_FAILED", "conversationId 不合法。")
  }

  const rawBeforeSequenceNo = searchParams.get("beforeSequenceNo")
  const rawLimit = searchParams.get("limit")

  const parsePositiveInteger = (value: string | null) => {
    if (!value) {
      return null
    }

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      return null
    }

    return parsed
  }

  const beforeSequenceNo =
    rawBeforeSequenceNo === null ? null : parsePositiveInteger(rawBeforeSequenceNo)
  const limit = rawLimit === null ? null : parsePositiveInteger(rawLimit)

  if (rawBeforeSequenceNo !== null && beforeSequenceNo === null) {
    return fail("VALIDATION_FAILED", "beforeSequenceNo 必须是正整数。")
  }

  if (rawLimit !== null && limit === null) {
    return fail("VALIDATION_FAILED", "limit 必须是正整数。")
  }

  return ok({
    conversationId,
    beforeSequenceNo,
    limit: limit ?? undefined,
  })
}

export function parseHistoryRecentQuery(searchParams: URLSearchParams): ValidationSuccess<{
  page: number
  pageSize: number
  filter: HistoryFilter
}> {
  const status = searchParams.get("status")
  const filter =
    status === "all"
    || status === "in_progress"
    || status === "interrupted"
    || status === "completed"
    || status === "abandoned"
      ? status
      : "all"

  return ok({
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "20"),
    filter,
  })
}

export function parseAdminFeedbackListQuery(searchParams: URLSearchParams) {
  const rawStatus = searchParams.get("status")
  const rawFeedbackType = searchParams.get("feedbackType")
  const rawPriority = searchParams.get("priority")
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")

  const status: FeedbackStatus | null =
    rawStatus && FEEDBACK_STATUSES.includes(rawStatus as (typeof FEEDBACK_STATUSES)[number])
      ? (rawStatus as FeedbackStatus)
      : null

  const feedbackType: FeedbackType | null =
    rawFeedbackType && FEEDBACK_TYPES.includes(rawFeedbackType as (typeof FEEDBACK_TYPES)[number])
      ? (rawFeedbackType as FeedbackType)
      : null

  const priority: FeedbackPriority | null =
    rawPriority && FEEDBACK_PRIORITIES.includes(rawPriority as (typeof FEEDBACK_PRIORITIES)[number])
      ? (rawPriority as FeedbackPriority)
      : null

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 50
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  if (rawStatus && !status) {
    return fail("VALIDATION_FAILED", "status 参数不合法。")
  }

  if (rawFeedbackType && !feedbackType) {
    return fail("VALIDATION_FAILED", "feedbackType 参数不合法。")
  }

  if (rawPriority && !priority) {
    return fail("VALIDATION_FAILED", "priority 参数不合法。")
  }

  return ok({
    status: status ?? undefined,
    feedbackType: feedbackType ?? undefined,
    priority: priority ?? undefined,
    keyword: searchParams.get("keyword")?.trim() || undefined,
    userId: searchParams.get("userId")?.trim() || undefined,
    limit,
    page,
  })
}

const ADMIN_USER_ACCOUNT_STATUSES = ["active", "deleted", "all"] as const
const ADMIN_LEARNING_LEVELS = ["beginner", "intermediate", "advanced"] as const
const ADMIN_SELECTION_MODES = ["self_directed", "preset_training"] as const

function parseJsonRecord(
  value: unknown,
  fieldName: string,
): ValidationResult<Record<string, unknown>> {
  if (value == null) {
    return ok({})
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是对象。`)
  }

  return ok(value as Record<string, unknown>)
}

function parseTrimmedRequiredString(
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 5000,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是字符串。`)
  }

  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) {
    return fail("VALIDATION_FAILED", `${fieldName} 长度不合法。`)
  }

  return ok(normalized)
}

function parseTrimmedNullableString(
  value: unknown,
  fieldName: string,
  maxLength = 5000,
): ValidationResult<string | null> {
  if (value == null) {
    return ok(null)
  }

  if (typeof value !== "string") {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是字符串或 null。`)
  }

  const normalized = value.trim()
  if (normalized.length > maxLength) {
    return fail("VALIDATION_FAILED", `${fieldName} 长度不合法。`)
  }

  return ok(normalized.length > 0 ? normalized : null)
}

function parsePositiveInteger(
  value: unknown,
  fieldName: string,
  minValue = 1,
  maxValue = 1_000_000,
): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minValue || value > maxValue) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是 ${minValue} 到 ${maxValue} 之间的整数。`)
  }

  return ok(value)
}

function parseNullableNumber(
  value: unknown,
  fieldName: string,
  minValue = 0,
  maxValue = 10,
): ValidationResult<number | null> {
  if (value == null) {
    return ok(null)
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < minValue || value > maxValue) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是 ${minValue} 到 ${maxValue} 之间的数字。`)
  }

  return ok(value)
}

function parseBooleanField(value: unknown, fieldName: string): ValidationResult<boolean> {
  if (typeof value !== "boolean") {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是布尔值。`)
  }

  return ok(value)
}

function parseUuidOrNull(value: unknown, fieldName: string): ValidationResult<string | null> {
  if (value == null) {
    return ok(null)
  }

  if (typeof value !== "string" || !isUuid(value.trim())) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是 UUID 或 null。`)
  }

  return ok(value.trim())
}

function parseChangeReason(value: unknown) {
  const parsed = parseTrimmedRequiredString(value, "changeReason", 2, 500)
  if (!parsed.ok) {
    return fail(parsed.code, "changeReason 至少 2 个字符且最多 500 个字符。")
  }

  return parsed
}

function parseEnumField<T extends string>(
  value: unknown,
  fieldName: string,
  candidates: readonly T[],
): ValidationResult<T> {
  if (typeof value !== "string") {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是字符串。`)
  }

  const normalized = value.trim()
  if (!candidates.includes(normalized as T)) {
    return fail("VALIDATION_FAILED", `${fieldName} 不合法。`)
  }

  return ok(normalized as T)
}

function parseEnumStringArray<T extends string>(
  value: unknown,
  fieldName: string,
  candidates: readonly T[],
): ValidationResult<T[]> {
  if (!Array.isArray(value)) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是数组。`)
  }

  const normalized = value
    .map((item) => typeof item === "string" ? item.trim() : null)
    .filter((item): item is string => Boolean(item))

  if (normalized.length !== value.length) {
    return fail("VALIDATION_FAILED", `${fieldName} 必须是字符串数组。`)
  }

  const unique = Array.from(new Set(normalized))
  if (!unique.every((item) => candidates.includes(item as T))) {
    return fail("VALIDATION_FAILED", `${fieldName} 包含不支持的值。`)
  }

  return ok(unique as T[])
}

function parseSharedListPagination(searchParams: URLSearchParams, defaults?: { limit?: number }) {
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : (defaults?.limit ?? 20)
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  return ok({ limit, page })
}

export function parseAdminSettingsAccountListQuery(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")
  const rawStatus = searchParams.get("status")

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 20
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  let status: AdminSettingsAccountListStatus = "all"
  if (rawStatus) {
    if (!ADMIN_SETTINGS_ACCOUNT_LIST_STATUSES.includes(rawStatus as AdminSettingsAccountListStatus)) {
      return fail("VALIDATION_FAILED", "status 参数不合法。")
    }
    status = rawStatus as AdminSettingsAccountListStatus
  }

  return ok({
    keyword: searchParams.get("keyword")?.trim() || undefined,
    status,
    limit,
    page,
  })
}

export function parseAdminSettingsAuditListQuery(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")
  const rawAction = searchParams.get("action")
  const rawTargetType = searchParams.get("targetType")

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 20
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  const action = rawAction?.trim() || "all"
  if (action !== "all" && !action.match(/^[a-z_]+$/)) {
    return fail("VALIDATION_FAILED", "action 参数不合法。")
  }

  let targetType: AdminSettingsAuditTargetType = "all"
  if (rawTargetType) {
    if (!ADMIN_SETTINGS_AUDIT_TARGET_TYPES.includes(rawTargetType as AdminSettingsAuditTargetType)) {
      return fail("VALIDATION_FAILED", "targetType 参数不合法。")
    }
    targetType = rawTargetType as AdminSettingsAuditTargetType
  }

  return ok({
    keyword: searchParams.get("keyword")?.trim() || undefined,
    action,
    targetType,
    limit,
    page,
  })
}

export function parseAdminUserListQuery(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")
  const rawAccountStatus = searchParams.get("accountStatus")
  const rawOnboarding = searchParams.get("onboardingCompleted")
  const rawHasPath = searchParams.get("hasActiveLearningPath")

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 50
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  let accountStatus: (typeof ADMIN_USER_ACCOUNT_STATUSES)[number] = "active"
  if (rawAccountStatus) {
    if (!ADMIN_USER_ACCOUNT_STATUSES.includes(rawAccountStatus as (typeof ADMIN_USER_ACCOUNT_STATUSES)[number])) {
      return fail("VALIDATION_FAILED", "accountStatus 参数不合法。")
    }
    accountStatus = rawAccountStatus as (typeof ADMIN_USER_ACCOUNT_STATUSES)[number]
  }

  let onboardingCompleted: boolean | undefined
  if (rawOnboarding === "true") {
    onboardingCompleted = true
  } else if (rawOnboarding === "false") {
    onboardingCompleted = false
  } else if (rawOnboarding != null && rawOnboarding !== "") {
    return fail("VALIDATION_FAILED", "onboardingCompleted 参数不合法。")
  }

  let hasActiveLearningPath: boolean | undefined
  if (rawHasPath === "true") {
    hasActiveLearningPath = true
  } else if (rawHasPath === "false") {
    hasActiveLearningPath = false
  } else if (rawHasPath != null && rawHasPath !== "") {
    return fail("VALIDATION_FAILED", "hasActiveLearningPath 参数不合法。")
  }

  return ok({
    accountStatus,
    onboardingCompleted,
    hasActiveLearningPath,
    keyword: searchParams.get("keyword")?.trim() || undefined,
    limit,
    page,
  })
}

export function parseAdminLearningPathListQuery(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit")
  const rawPage = searchParams.get("page")
  const rawStatus = searchParams.get("status")
  const rawLearningLevel = searchParams.get("learningLevel")
  const rawUpdatedWithin = searchParams.get("updatedWithin")

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 20
  const page = rawPage ? Number.parseInt(rawPage, 10) : 1

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (!Number.isFinite(page) || page < 1) {
    return fail("VALIDATION_FAILED", "page 必须是大于等于 1 的整数。")
  }

  let status: AdminLearningPathListStatus = "all"
  if (rawStatus) {
    if (!ADMIN_LEARNING_PATH_LIST_STATUSES.includes(rawStatus as AdminLearningPathListStatus)) {
      return fail("VALIDATION_FAILED", "status 参数不合法。")
    }
    status = rawStatus as AdminLearningPathListStatus
  }

  let learningLevel: "beginner" | "intermediate" | "advanced" | undefined
  if (rawLearningLevel) {
    if (!ADMIN_LEARNING_LEVELS.includes(rawLearningLevel as (typeof ADMIN_LEARNING_LEVELS)[number])) {
      return fail("VALIDATION_FAILED", "learningLevel 参数不合法。")
    }
    learningLevel = rawLearningLevel as (typeof ADMIN_LEARNING_LEVELS)[number]
  }

  let updatedWithin: AdminLearningUpdatedWithin = "all"
  if (rawUpdatedWithin) {
    if (!ADMIN_LEARNING_UPDATED_WITHIN_OPTIONS.includes(rawUpdatedWithin as AdminLearningUpdatedWithin)) {
      return fail("VALIDATION_FAILED", "updatedWithin 参数不合法。")
    }
    updatedWithin = rawUpdatedWithin as AdminLearningUpdatedWithin
  }

  return ok({
    keyword: searchParams.get("keyword")?.trim() || undefined,
    status,
    toolCode: searchParams.get("toolCode")?.trim() || undefined,
    learningLevel,
    updatedWithin,
    limit,
    page,
  })
}

export function parseAdminLearningSessionListQuery(searchParams: URLSearchParams) {
  return parseSharedListPagination(searchParams)
}

export function parseAdminAIAgentListQuery(
  searchParams: URLSearchParams,
  options?: {
    allowScenario?: boolean
    allowStatus?: boolean
  },
) {
  const pagination = parseSharedListPagination(searchParams)
  if (!pagination.ok) {
    return pagination
  }

  const allowScenario = options?.allowScenario ?? true
  const allowStatus = options?.allowStatus ?? true
  const rawScenarioType = searchParams.get("scenarioType")
  const rawStatus = searchParams.get("status")

  let scenarioType: AdminAIAgentScenarioType | undefined
  if (allowScenario && rawScenarioType) {
    if (!ADMIN_AI_AGENT_SCENARIO_TYPES.includes(rawScenarioType as AdminAIAgentScenarioType)) {
      return fail("VALIDATION_FAILED", "scenarioType 参数不合法。")
    }
    scenarioType = rawScenarioType as AdminAIAgentScenarioType
  }

  let status: "all" | "active" | "inactive" = "all"
  if (allowStatus && rawStatus) {
    if (!ADMIN_AI_ACTIVE_STATUS_OPTIONS.includes(rawStatus as (typeof ADMIN_AI_ACTIVE_STATUS_OPTIONS)[number])) {
      return fail("VALIDATION_FAILED", "status 参数不合法。")
    }
    status = rawStatus as "all" | "active" | "inactive"
  }

  return ok({
    keyword: searchParams.get("keyword")?.trim() || undefined,
    ...(allowScenario ? { scenarioType } : {}),
    ...(allowStatus ? { status } : {}),
    ...pagination.data,
  })
}

export function parseAdminAIInvocationListQuery(searchParams: URLSearchParams) {
  const pagination = parseSharedListPagination(searchParams)
  if (!pagination.ok) {
    return pagination
  }

  const rawStatus = searchParams.get("status")
  const rawDateRange = searchParams.get("dateRange")
  let status: AdminAIInvocationStatusOption = "all"
  if (rawStatus) {
    if (!ADMIN_AI_INVOCATION_STATUS_OPTIONS.includes(rawStatus as AdminAIInvocationStatusOption)) {
      return fail("VALIDATION_FAILED", "status 参数不合法。")
    }
    status = rawStatus as AdminAIInvocationStatusOption
  }

  let dateRange: AdminAIInvocationDateRange = "7d"
  if (rawDateRange) {
    if (!ADMIN_AI_INVOCATION_DATE_RANGES.includes(rawDateRange as AdminAIInvocationDateRange)) {
      return fail("VALIDATION_FAILED", "dateRange 参数不合法。")
    }
    dateRange = rawDateRange as AdminAIInvocationDateRange
  }

  const rawStartDate = searchParams.get("startDate")?.trim()
  const rawEndDate = searchParams.get("endDate")?.trim()
  const startDate = rawStartDate || undefined
  const endDate = rawEndDate || undefined

  if (startDate && isNaN(Date.parse(startDate))) {
    return fail("VALIDATION_FAILED", "startDate 格式不合法，需为 ISO 8601 日期。")
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    return fail("VALIDATION_FAILED", "endDate 格式不合法，需为 ISO 8601 日期。")
  }

  return ok({
    keyword: searchParams.get("keyword")?.trim() || undefined,
    status,
    providerCode: searchParams.get("providerCode")?.trim() || undefined,
    modelCode: searchParams.get("modelCode")?.trim() || undefined,
    agentCode: searchParams.get("agentCode")?.trim() || undefined,
    dateRange,
    startDate,
    endDate,
    ...pagination.data,
  })
}

const adminAIProviderShapeSchema = z.object({
  code: z.unknown(),
  name: z.unknown(),
  providerType: z.unknown(),
  baseUrl: z.unknown(),
  authMode: z.unknown(),
  envSecretRef: z.unknown().optional(),
  apiKey: z.unknown().optional(),
  keepExistingSecret: z.unknown(),
  supportsStream: z.unknown(),
  supportsJsonMode: z.unknown(),
  timeoutMs: z.unknown(),
  retryCount: z.unknown(),
  isActive: z.unknown(),
  metadata: z.unknown().optional(),
  version: z.unknown().optional(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAIProviderBody(input: unknown): ValidationResult<AdminAIProviderUpsertRequest> {
  const shape = adminAIProviderShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Provider 请求体不合法。")
  }

  const code = parseTrimmedRequiredString(shape.data.code, "code", 2, 64)
  const name = parseTrimmedRequiredString(shape.data.name, "name", 2, 128)
  const baseUrl = parseTrimmedRequiredString(shape.data.baseUrl, "baseUrl", 8, 500)
  const envSecretRef = parseTrimmedNullableString(shape.data.envSecretRef, "envSecretRef", 128)
  const apiKey = parseTrimmedNullableString(shape.data.apiKey, "apiKey", 1000)
  const keepExistingSecret = parseBooleanField(shape.data.keepExistingSecret, "keepExistingSecret")
  const timeoutMs = parsePositiveInteger(shape.data.timeoutMs, "timeoutMs", 1000, 300_000)
  const retryCount = parsePositiveInteger(shape.data.retryCount, "retryCount", 1, 10)
  const supportsStream = parseBooleanField(shape.data.supportsStream, "supportsStream")
  const supportsJsonMode = parseBooleanField(shape.data.supportsJsonMode, "supportsJsonMode")
  const isActive = parseBooleanField(shape.data.isActive, "isActive")
  const metadata = parseJsonRecord(shape.data.metadata, "metadata")
  const changeReason = parseChangeReason(shape.data.changeReason)

  const fieldChecks = [
    code,
    name,
    baseUrl,
    envSecretRef,
    apiKey,
    keepExistingSecret,
    timeoutMs,
    retryCount,
    supportsStream,
    supportsJsonMode,
    isActive,
    metadata,
    changeReason,
  ]

  const firstFailure = fieldChecks.find((item) => !item.ok)
  if (firstFailure && !firstFailure.ok) {
    return firstFailure
  }

  const parsedCode = code as ValidationSuccess<string>
  const parsedName = name as ValidationSuccess<string>
  const parsedBaseUrl = baseUrl as ValidationSuccess<string>
  const parsedEnvSecretRef = envSecretRef as ValidationSuccess<string | null>
  const parsedApiKey = apiKey as ValidationSuccess<string | null>
  const parsedKeepExistingSecret = keepExistingSecret as ValidationSuccess<boolean>
  const parsedSupportsStream = supportsStream as ValidationSuccess<boolean>
  const parsedSupportsJsonMode = supportsJsonMode as ValidationSuccess<boolean>
  const parsedTimeoutMs = timeoutMs as ValidationSuccess<number>
  const parsedRetryCount = retryCount as ValidationSuccess<number>
  const parsedIsActive = isActive as ValidationSuccess<boolean>
  const parsedMetadata = metadata as ValidationSuccess<Record<string, unknown>>
  const parsedChangeReason = changeReason as ValidationSuccess<string>

  if (!parsedApiKey.data && !parsedKeepExistingSecret.data && !parsedEnvSecretRef.data) {
    return fail("VALIDATION_FAILED", "至少提供 apiKey、keepExistingSecret 或 envSecretRef 之一。")
  }

  if (!ADMIN_AI_PROVIDER_TYPES.includes(shape.data.providerType as (typeof ADMIN_AI_PROVIDER_TYPES)[number])) {
    return fail("VALIDATION_FAILED", "providerType 参数不合法。")
  }

  if (!ADMIN_AI_AUTH_MODES.includes(shape.data.authMode as (typeof ADMIN_AI_AUTH_MODES)[number])) {
    return fail("VALIDATION_FAILED", "authMode 参数不合法。")
  }

  if (!isValidUrl(parsedBaseUrl.data)) {
    return fail("VALIDATION_FAILED", "baseUrl 必须是合法 URL。")
  }

  const version = shape.data.version !== undefined
    ? parsePositiveInteger(shape.data.version, "version", 1, Number.MAX_SAFE_INTEGER)
    : null

  if (version !== null && !version.ok) {
    return fail("VALIDATION_FAILED", "version 参数不合法，需为正整数。")
  }

  return ok({
    code: parsedCode.data.toLowerCase(),
    name: parsedName.data,
    providerType: shape.data.providerType as AdminAIProviderUpsertRequest["providerType"],
    baseUrl: parsedBaseUrl.data,
    authMode: shape.data.authMode as AdminAIProviderUpsertRequest["authMode"],
    envSecretRef: parsedEnvSecretRef.data,
    apiKey: parsedApiKey.data,
    keepExistingSecret: parsedKeepExistingSecret.data,
    supportsStream: parsedSupportsStream.data,
    supportsJsonMode: parsedSupportsJsonMode.data,
    timeoutMs: parsedTimeoutMs.data,
    retryCount: parsedRetryCount.data,
    isActive: parsedIsActive.data,
    metadata: parsedMetadata.data,
    version: version !== null ? (version as ValidationSuccess<number>).data : undefined,
    changeReason: parsedChangeReason.data,
  })
}

const adminAIProviderTestConnectionShapeSchema = z
  .object({
    baseUrl: z.unknown(),
    authMode: z.unknown(),
    providerType: z.unknown(),
    envSecretRef: z.unknown().optional(),
    apiKey: z.unknown().optional(),
    timeoutMs: z.unknown().optional(),
  })
  .strict()

export function parseAdminAIProviderTestConnectionBody(
  input: unknown,
): ValidationResult<AdminAIProviderTestConnectionRequest> {
  const shape = adminAIProviderTestConnectionShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Provider 连接测试请求体不合法。")
  }

  const baseUrl = parseTrimmedRequiredString(shape.data.baseUrl, "baseUrl", 8, 500)
  const envSecretRef = parseTrimmedNullableString(shape.data.envSecretRef, "envSecretRef", 128)
  const apiKey = parseTrimmedNullableString(shape.data.apiKey, "apiKey", 1000)
  const timeoutMs =
    shape.data.timeoutMs === undefined || shape.data.timeoutMs === null
      ? ok(15_000)
      : parsePositiveInteger(shape.data.timeoutMs, "timeoutMs", 1000, 300_000)

  const checks = [baseUrl, envSecretRef, apiKey, timeoutMs]
  const first = checks.find((item) => !item.ok)
  if (first && !first.ok) {
    return first
  }

  if (!ADMIN_AI_PROVIDER_TYPES.includes(shape.data.providerType as (typeof ADMIN_AI_PROVIDER_TYPES)[number])) {
    return fail("VALIDATION_FAILED", "providerType 参数不合法。")
  }

  if (!ADMIN_AI_AUTH_MODES.includes(shape.data.authMode as (typeof ADMIN_AI_AUTH_MODES)[number])) {
    return fail("VALIDATION_FAILED", "authMode 参数不合法。")
  }

  const parsedBaseUrl = baseUrl as ValidationSuccess<string>
  if (!isValidUrl(parsedBaseUrl.data)) {
    return fail("VALIDATION_FAILED", "baseUrl 必须是合法 URL。")
  }

  return ok({
    baseUrl: parsedBaseUrl.data,
    authMode: shape.data.authMode as AdminAIProviderTestConnectionRequest["authMode"],
    providerType: shape.data.providerType as AdminAIProviderTestConnectionRequest["providerType"],
    envSecretRef: (envSecretRef as ValidationSuccess<string | null>).data,
    apiKey: (apiKey as ValidationSuccess<string | null>).data,
    timeoutMs: (timeoutMs as ValidationSuccess<number>).data,
  })
}

const adminAIModelTestConnectionShapeSchema = z
  .object({
    providerCode: z.unknown(),
    modelName: z.unknown(),
    maxOutputTokens: z.unknown().optional(),
    timeoutMs: z.unknown().optional(),
  })
  .strict()

export function parseAdminAIModelTestConnectionBody(
  input: unknown,
): ValidationResult<AdminAIModelTestConnectionRequest> {
  const shape = adminAIModelTestConnectionShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Model 连接测试请求体不合法。")
  }

  const providerCode = parseTrimmedRequiredString(shape.data.providerCode, "providerCode", 1, 64)
  const modelName = parseTrimmedRequiredString(shape.data.modelName, "modelName", 1, 256)
  const maxOutputTokens =
    shape.data.maxOutputTokens === undefined || shape.data.maxOutputTokens === null
      ? ok(16)
      : parsePositiveInteger(shape.data.maxOutputTokens, "maxOutputTokens", 1, 512)

  const checks = [providerCode, modelName, maxOutputTokens]
  const first = checks.find((item) => !item.ok)
  if (first && !first.ok) {
    return first
  }

  let timeoutMs: number | undefined
  if (shape.data.timeoutMs !== undefined && shape.data.timeoutMs !== null) {
    const parsedTimeout = parsePositiveInteger(shape.data.timeoutMs, "timeoutMs", 1000, 300_000)
    if (!parsedTimeout.ok) {
      return parsedTimeout
    }
    timeoutMs = parsedTimeout.data
  }

  return ok({
    providerCode: (providerCode as ValidationSuccess<string>).data,
    modelName: (modelName as ValidationSuccess<string>).data,
    maxOutputTokens: (maxOutputTokens as ValidationSuccess<number>).data,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  })
}

const adminAIModelShapeSchema = z.object({
  providerCode: z.unknown(),
  code: z.unknown(),
  displayName: z.unknown(),
  modelName: z.unknown(),
  supportsStream: z.unknown(),
  supportsJsonMode: z.unknown(),
  supportsToolCalling: z.unknown(),
  maxContextTokens: z.unknown(),
  defaultMaxOutputTokens: z.unknown(),
  recommendedTemperature: z.unknown().optional(),
  modelFamily: z.unknown(),
  runtimeCapabilities: z.unknown(),
  connectionTestMode: z.unknown(),
  reasoningEnabled: z.unknown(),
  profileGroup: z.unknown().optional(),
  notes: z.unknown().optional(),
  pricingMetadata: z.unknown().optional(),
  isActive: z.unknown(),
  metadata: z.unknown().optional(),
  version: z.unknown().optional(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAIModelBody(input: unknown): ValidationResult<AdminAIModelUpsertRequest> {
  const shape = adminAIModelShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Model 请求体不合法。")
  }

  const providerCode = parseTrimmedRequiredString(shape.data.providerCode, "providerCode", 2, 64)
  const code = parseTrimmedRequiredString(shape.data.code, "code", 2, 64)
  const displayName = parseTrimmedRequiredString(shape.data.displayName, "displayName", 2, 128)
  const modelName = parseTrimmedRequiredString(shape.data.modelName, "modelName", 2, 256)
  const supportsStream = parseBooleanField(shape.data.supportsStream, "supportsStream")
  const supportsJsonMode = parseBooleanField(shape.data.supportsJsonMode, "supportsJsonMode")
  const supportsToolCalling = parseBooleanField(shape.data.supportsToolCalling, "supportsToolCalling")
  const maxContextTokens = parsePositiveInteger(shape.data.maxContextTokens, "maxContextTokens", 256, 10_000_000)
  const defaultMaxOutputTokens = parsePositiveInteger(shape.data.defaultMaxOutputTokens, "defaultMaxOutputTokens", 1, 1_000_000)
  const recommendedTemperature = parseNullableNumber(shape.data.recommendedTemperature, "recommendedTemperature", 0, 2)
  const modelFamily = parseEnumField<AdminAIModelFamily>(shape.data.modelFamily, "modelFamily", ADMIN_AI_MODEL_FAMILIES)
  const runtimeCapabilities = parseEnumStringArray<AdminAIModelRuntimeCapability>(
    shape.data.runtimeCapabilities,
    "runtimeCapabilities",
    ADMIN_AI_MODEL_RUNTIME_CAPABILITIES,
  )
  const connectionTestMode = parseEnumField<AdminAIModelConnectionTestMode>(
    shape.data.connectionTestMode,
    "connectionTestMode",
    ADMIN_AI_MODEL_CONNECTION_TEST_MODES,
  )
  const reasoningEnabled = parseBooleanField(shape.data.reasoningEnabled, "reasoningEnabled")
  const profileGroup = parseTrimmedNullableString(shape.data.profileGroup, "profileGroup", 128)
  const notes = parseTrimmedNullableString(shape.data.notes, "notes", 2_000)
  const pricingMetadata = parseJsonRecord(shape.data.pricingMetadata, "pricingMetadata")
  const isActive = parseBooleanField(shape.data.isActive, "isActive")
  const metadata = parseJsonRecord(shape.data.metadata, "metadata")
  const changeReason = parseChangeReason(shape.data.changeReason)

  const version = shape.data.version !== undefined
    ? parsePositiveInteger(shape.data.version, "version", 1, Number.MAX_SAFE_INTEGER)
    : null

  if (version !== null && !version.ok) {
    return fail("VALIDATION_FAILED", "version 参数不合法，需为正整数。")
  }

  if (
    !providerCode.ok
    || !code.ok
    || !displayName.ok
    || !modelName.ok
    || !supportsStream.ok
    || !supportsJsonMode.ok
    || !supportsToolCalling.ok
    || !maxContextTokens.ok
    || !defaultMaxOutputTokens.ok
    || !recommendedTemperature.ok
    || !modelFamily.ok
    || !runtimeCapabilities.ok
    || !connectionTestMode.ok
    || !reasoningEnabled.ok
    || !profileGroup.ok
    || !notes.ok
    || !pricingMetadata.ok
    || !isActive.ok
    || !metadata.ok
    || !changeReason.ok
  ) {
    return fail("VALIDATION_FAILED", "Model 请求体字段不合法。")
  }

  return ok({
    providerCode: providerCode.data.toLowerCase(),
    code: code.data.toLowerCase(),
    displayName: displayName.data,
    modelName: modelName.data,
    supportsStream: supportsStream.data,
    supportsJsonMode: supportsJsonMode.data,
    supportsToolCalling: supportsToolCalling.data,
    maxContextTokens: maxContextTokens.data,
    defaultMaxOutputTokens: defaultMaxOutputTokens.data,
    recommendedTemperature: recommendedTemperature.data,
    modelFamily: modelFamily.data,
    runtimeCapabilities: runtimeCapabilities.data,
    connectionTestMode: connectionTestMode.data,
    reasoningEnabled: reasoningEnabled.data,
    profileGroup: profileGroup.data,
    notes: notes.data,
    pricingMetadata: pricingMetadata.data,
    isActive: isActive.data,
    metadata: metadata.data,
    version: version !== null ? (version as ValidationSuccess<number>).data : undefined,
    changeReason: changeReason.data,
  })
}

const adminAIAgentShapeSchema = z.object({
  code: z.unknown(),
  name: z.unknown(),
  scenarioType: z.unknown(),
  description: z.unknown().optional(),
  systemPromptTemplate: z.unknown(),
  developerPromptTemplate: z.unknown().optional(),
  defaultProviderCode: z.unknown(),
  defaultModelCode: z.unknown(),
  contextMessageLimit: z.unknown(),
  maxOutputTokens: z.unknown(),
  temperature: z.unknown(),
  topP: z.unknown().optional(),
  streamEnabled: z.unknown(),
  isActive: z.unknown(),
  metadata: z.unknown().optional(),
  version: z.unknown().optional(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAIAgentBody(input: unknown): ValidationResult<AdminAIAgentUpsertRequest> {
  const shape = adminAIAgentShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Agent 请求体不合法。")
  }

  if (!ADMIN_AI_AGENT_SCENARIO_TYPES.includes(shape.data.scenarioType as AdminAIAgentScenarioType)) {
    return fail("VALIDATION_FAILED", "scenarioType 参数不合法。")
  }

  const code = parseTrimmedRequiredString(shape.data.code, "code", 2, 64)
  const name = parseTrimmedRequiredString(shape.data.name, "name", 2, 128)
  const description = parseTrimmedNullableString(shape.data.description, "description", 5000)
  const systemPromptTemplate = parseTrimmedRequiredString(shape.data.systemPromptTemplate, "systemPromptTemplate", 10, 50_000)
  const developerPromptTemplate = parseTrimmedNullableString(shape.data.developerPromptTemplate, "developerPromptTemplate", 50_000)
  const defaultProviderCode = parseTrimmedRequiredString(shape.data.defaultProviderCode, "defaultProviderCode", 2, 64)
  const defaultModelCode = parseTrimmedRequiredString(shape.data.defaultModelCode, "defaultModelCode", 2, 64)
  const contextMessageLimit = parsePositiveInteger(shape.data.contextMessageLimit, "contextMessageLimit", 1, 100)
  const maxOutputTokens = parsePositiveInteger(shape.data.maxOutputTokens, "maxOutputTokens", 1, 100_000)
  const temperature = parseNullableNumber(shape.data.temperature, "temperature", 0, 2)
  const topP = parseNullableNumber(shape.data.topP, "topP", 0, 1)
  const streamEnabled = parseBooleanField(shape.data.streamEnabled, "streamEnabled")
  const isActive = parseBooleanField(shape.data.isActive, "isActive")
  const metadata = parseJsonRecord(shape.data.metadata, "metadata")
  const changeReason = parseChangeReason(shape.data.changeReason)

  const version = shape.data.version !== undefined
    ? parsePositiveInteger(shape.data.version, "version", 1, Number.MAX_SAFE_INTEGER)
    : null

  if (version !== null && !version.ok) {
    return fail("VALIDATION_FAILED", "version 参数不合法，需为正整数。")
  }

  if (!code.ok || !name.ok || !description.ok || !systemPromptTemplate.ok || !developerPromptTemplate.ok || !defaultProviderCode.ok || !defaultModelCode.ok || !contextMessageLimit.ok || !maxOutputTokens.ok || !temperature.ok || !topP.ok || !streamEnabled.ok || !isActive.ok || !metadata.ok || !changeReason.ok) {
    return fail("VALIDATION_FAILED", "Agent 请求体字段不合法。")
  }

  return ok({
    code: code.data.toLowerCase(),
    name: name.data,
    scenarioType: shape.data.scenarioType as AdminAIAgentScenarioType,
    description: description.data,
    systemPromptTemplate: systemPromptTemplate.data,
    developerPromptTemplate: developerPromptTemplate.data,
    defaultProviderCode: defaultProviderCode.data.toLowerCase(),
    defaultModelCode: defaultModelCode.data.toLowerCase(),
    contextMessageLimit: contextMessageLimit.data,
    maxOutputTokens: maxOutputTokens.data,
    temperature: temperature.data ?? 0,
    topP: topP.data,
    streamEnabled: streamEnabled.data,
    isActive: isActive.data,
    metadata: metadata.data,
    version: version !== null ? (version as ValidationSuccess<number>).data : undefined,
    changeReason: changeReason.data,
  })
}

const adminAIAgentBindingShapeSchema = z.object({
  agentCode: z.unknown(),
  toolId: z.unknown().optional(),
  learningLevel: z.unknown().optional(),
  selectionMode: z.unknown().optional(),
  pathId: z.unknown().optional(),
  stepNo: z.unknown().optional(),
  interactionType: z.unknown(),
  priority: z.unknown(),
  isActive: z.unknown(),
  metadata: z.unknown().optional(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAIAgentBindingBody(input: unknown): ValidationResult<AdminAIAgentBindingUpsertRequest> {
  const shape = adminAIAgentBindingShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Agent 命中规则请求体不合法。")
  }

  const agentCode = parseTrimmedRequiredString(shape.data.agentCode, "agentCode", 2, 64)
  const toolId = parseUuidOrNull(shape.data.toolId, "toolId")
  const pathId = parseUuidOrNull(shape.data.pathId, "pathId")
  const interactionType = parseTrimmedRequiredString(shape.data.interactionType, "interactionType", 2, 32)
  const priority = parsePositiveInteger(shape.data.priority, "priority", 1, 1000)
  const isActive = parseBooleanField(shape.data.isActive, "isActive")
  const metadata = parseJsonRecord(shape.data.metadata, "metadata")
  const changeReason = parseChangeReason(shape.data.changeReason)

  if (!agentCode.ok || !toolId.ok || !pathId.ok || !interactionType.ok || !priority.ok || !isActive.ok || !metadata.ok || !changeReason.ok) {
    return fail("VALIDATION_FAILED", "Agent 命中规则字段不合法。")
  }

  let learningLevel: "beginner" | "intermediate" | "advanced" | null = null
  if (shape.data.learningLevel != null) {
    if (!ADMIN_LEARNING_LEVELS.includes(shape.data.learningLevel as (typeof ADMIN_LEARNING_LEVELS)[number])) {
      return fail("VALIDATION_FAILED", "learningLevel 参数不合法。")
    }
    learningLevel = shape.data.learningLevel as "beginner" | "intermediate" | "advanced"
  }

  let selectionMode: "self_directed" | "preset_training" | null = null
  if (shape.data.selectionMode != null) {
    if (!ADMIN_SELECTION_MODES.includes(shape.data.selectionMode as (typeof ADMIN_SELECTION_MODES)[number])) {
      return fail("VALIDATION_FAILED", "selectionMode 参数不合法。")
    }
    selectionMode = shape.data.selectionMode as "self_directed" | "preset_training"
  }

  let stepNo: number | null = null
  if (shape.data.stepNo != null) {
    const parsedStep = parsePositiveInteger(shape.data.stepNo, "stepNo", 1, 10_000)
    if (!parsedStep.ok) {
      return parsedStep
    }
    stepNo = parsedStep.data
  }

  return ok({
    agentCode: agentCode.data.toLowerCase(),
    toolId: toolId.data,
    learningLevel,
    selectionMode,
    pathId: pathId.data,
    stepNo,
    interactionType: interactionType.data,
    priority: priority.data,
    isActive: isActive.data,
    metadata: metadata.data,
    changeReason: changeReason.data,
  })
}

const adminAIAgentSkillBindingShapeSchema = z.object({
  agentCode: z.unknown(),
  skillCode: z.unknown(),
  priority: z.unknown(),
  isRequired: z.unknown(),
  contextBudgetTokens: z.unknown().optional(),
  isActive: z.unknown(),
  metadata: z.unknown().optional(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAIAgentSkillBindingBody(
  input: unknown,
): ValidationResult<AdminAIAgentSkillBindingUpsertRequest> {
  const shape = adminAIAgentSkillBindingShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "Agent Skill 绑定请求体不合法。")
  }

  const agentCode = parseTrimmedRequiredString(shape.data.agentCode, "agentCode", 2, 64)
  const skillCode = parseTrimmedRequiredString(shape.data.skillCode, "skillCode", 2, 64)
  const priority = parsePositiveInteger(shape.data.priority, "priority", 1, 1000)
  const isRequired = parseBooleanField(shape.data.isRequired, "isRequired")
  const isActive = parseBooleanField(shape.data.isActive, "isActive")
  const metadata = parseJsonRecord(shape.data.metadata, "metadata")
  const changeReason = parseChangeReason(shape.data.changeReason)

  if (!agentCode.ok || !skillCode.ok || !priority.ok || !isRequired.ok || !isActive.ok || !metadata.ok || !changeReason.ok) {
    return fail("VALIDATION_FAILED", "Agent Skill 绑定字段不合法。")
  }

  let contextBudgetTokens: number | null = null
  if (shape.data.contextBudgetTokens != null) {
    const parsedBudget = parsePositiveInteger(shape.data.contextBudgetTokens, "contextBudgetTokens", 1, 100_000)
    if (!parsedBudget.ok) {
      return parsedBudget
    }
    contextBudgetTokens = parsedBudget.data
  }

  return ok({
    agentCode: agentCode.data.toLowerCase(),
    skillCode: skillCode.data.toLowerCase(),
    priority: priority.data,
    isRequired: isRequired.data,
    contextBudgetTokens,
    isActive: isActive.data,
    metadata: metadata.data,
    changeReason: changeReason.data,
  })
}

const adminAIResolvePreviewShapeSchema = z.object({
  interactionType: z.unknown(),
  toolId: z.unknown().optional(),
  learningLevel: z.unknown().optional(),
  selectionMode: z.unknown().optional(),
  pathId: z.unknown().optional(),
  stepNo: z.unknown().optional(),
}).strict()

export function parseAdminAIResolvePreviewBody(
  input: unknown,
): ValidationResult<AdminAIResolvePreviewRequest> {
  const shape = adminAIResolvePreviewShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "命中预览请求体不合法。")
  }

  const interactionType = parseTrimmedRequiredString(shape.data.interactionType, "interactionType", 2, 32)
  const toolId = parseUuidOrNull(shape.data.toolId, "toolId")
  const pathId = parseUuidOrNull(shape.data.pathId, "pathId")
  if (!interactionType.ok || !toolId.ok || !pathId.ok) {
    return fail("VALIDATION_FAILED", "命中预览请求体字段不合法。")
  }

  let learningLevel: "beginner" | "intermediate" | "advanced" | null = null
  if (shape.data.learningLevel != null) {
    if (!ADMIN_LEARNING_LEVELS.includes(shape.data.learningLevel as (typeof ADMIN_LEARNING_LEVELS)[number])) {
      return fail("VALIDATION_FAILED", "learningLevel 参数不合法。")
    }
    learningLevel = shape.data.learningLevel as "beginner" | "intermediate" | "advanced"
  }

  let selectionMode: "self_directed" | "preset_training" | null = null
  if (shape.data.selectionMode != null) {
    if (!ADMIN_SELECTION_MODES.includes(shape.data.selectionMode as (typeof ADMIN_SELECTION_MODES)[number])) {
      return fail("VALIDATION_FAILED", "selectionMode 参数不合法。")
    }
    selectionMode = shape.data.selectionMode as "self_directed" | "preset_training"
  }

  let stepNo: number | null = null
  if (shape.data.stepNo != null) {
    const parsedStep = parsePositiveInteger(shape.data.stepNo, "stepNo", 1, 10_000)
    if (!parsedStep.ok) {
      return parsedStep
    }
    stepNo = parsedStep.data
  }

  return ok({
    interactionType: interactionType.data,
    toolId: toolId.data,
    learningLevel,
    selectionMode,
    pathId: pathId.data,
    stepNo,
  })
}

const adminAITestShapeSchema = z.object({
  agentCode: z.unknown(),
  providerCode: z.unknown(),
  modelCode: z.unknown(),
  prompt: z.unknown(),
  stream: z.unknown(),
  changeReason: z.unknown(),
}).strict()

export function parseAdminAITestBody(input: unknown): ValidationResult<AdminAITestRequest> {
  const shape = adminAITestShapeSchema.safeParse(input)
  if (!shape.success) {
    return fail("BAD_REQUEST", "AI 测试请求体不合法。")
  }

  const agentCode = parseTrimmedRequiredString(shape.data.agentCode, "agentCode", 2, 64)
  const providerCode = parseTrimmedRequiredString(shape.data.providerCode, "providerCode", 2, 64)
  const modelCode = parseTrimmedRequiredString(shape.data.modelCode, "modelCode", 2, 64)
  const prompt = parseTrimmedRequiredString(shape.data.prompt, "prompt", 2, 20_000)
  const stream = parseBooleanField(shape.data.stream, "stream")
  const changeReason = parseChangeReason(shape.data.changeReason)

  if (!agentCode.ok || !providerCode.ok || !modelCode.ok || !prompt.ok || !stream.ok || !changeReason.ok) {
    return fail("VALIDATION_FAILED", "AI 测试请求体字段不合法。")
  }

  return ok({
    agentCode: agentCode.data.toLowerCase(),
    providerCode: providerCode.data.toLowerCase(),
    modelCode: modelCode.data.toLowerCase(),
    prompt: prompt.data,
    stream: stream.data,
    changeReason: changeReason.data,
  })
}

const adminUserPatchShapeSchema = z
  .object({
    nickname: z.string().optional(),
    bio: z.unknown().optional(),
    contactEmail: z.unknown().optional(),
    wechat: z.unknown().optional(),
    contentLanguage: z.string().optional(),
    onboardingCompleted: z.boolean().optional(),
  })
  .strict()

export function parseAdminUserPatchBody(input: unknown): ValidationResult<AdminUpdateUserRequest> {
  const shape = adminUserPatchShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "用户更新请求体不合法。")
  }

  const data: AdminUpdateUserRequest = {}
  const raw = shape.data

  if (raw.nickname !== undefined) {
    const nickname = raw.nickname.trim()
    if (nickname.length < 1) {
      return fail("VALIDATION_FAILED", "昵称不能为空。")
    }
    if (nickname.length > 64) {
      return fail("VALIDATION_FAILED", "昵称最多 64 个字符。")
    }
    data.nickname = nickname
  }

  if (raw.bio !== undefined) {
    if (raw.bio === null) {
      data.bio = null
    } else if (typeof raw.bio === "string") {
      const bio = raw.bio.trim()
      if (bio.length > 2000) {
        return fail("VALIDATION_FAILED", "个人简介最多 2000 个字符。")
      }
      data.bio = bio.length > 0 ? bio : null
    } else {
      return fail("VALIDATION_FAILED", "bio 必须是字符串或 null。")
    }
  }

  if (raw.contactEmail !== undefined) {
    if (raw.contactEmail === null) {
      data.contactEmail = null
    } else if (typeof raw.contactEmail === "string") {
      const email = raw.contactEmail.trim()
      if (email.length > 255) {
        return fail("VALIDATION_FAILED", "联系邮箱过长。")
      }
      if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail("VALIDATION_FAILED", "联系邮箱格式不正确。")
      }
      data.contactEmail = email.length > 0 ? email : null
    } else {
      return fail("VALIDATION_FAILED", "contactEmail 必须是字符串或 null。")
    }
  }

  if (raw.wechat !== undefined) {
    if (raw.wechat === null) {
      data.wechat = null
    } else if (typeof raw.wechat === "string") {
      const wechat = raw.wechat.trim()
      if (wechat.length > 64) {
        return fail("VALIDATION_FAILED", "微信号最多 64 个字符。")
      }
      data.wechat = wechat.length > 0 ? wechat : null
    } else {
      return fail("VALIDATION_FAILED", "wechat 必须是字符串或 null。")
    }
  }

  if (raw.contentLanguage !== undefined) {
    const lang = raw.contentLanguage.trim()
    if (lang.length < 1 || lang.length > 16) {
      return fail("VALIDATION_FAILED", "contentLanguage 长度应在 1 到 16 之间。")
    }
    data.contentLanguage = lang
  }

  if (raw.onboardingCompleted !== undefined) {
    data.onboardingCompleted = raw.onboardingCompleted
  }

  if (Object.keys(data).length === 0) {
    return fail("VALIDATION_FAILED", "请至少提供一个要更新的字段。")
  }

  return ok(data)
}

const adminLearningPathStatusShapeSchema = z
  .object({
    action: z.string(),
    reason: z.unknown().optional(),
  })
  .strict()

export function parseAdminLearningPathStatusBody(
  input: unknown,
): ValidationResult<{
  action: AdminLearningPathStatusAction
  reason?: string | null
}> {
  const shape = adminLearningPathStatusShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "学习路径状态更新请求体不合法。")
  }

  if (!ADMIN_LEARNING_PATH_STATUS_ACTIONS.includes(shape.data.action as AdminLearningPathStatusAction)) {
    return fail("VALIDATION_FAILED", "action 参数不合法。")
  }

  let reason: string | null | undefined
  if (shape.data.reason !== undefined) {
    if (shape.data.reason === null) {
      reason = null
    } else if (typeof shape.data.reason === "string") {
      const normalized = shape.data.reason.trim()
      if (normalized.length > 500) {
        return fail("VALIDATION_FAILED", "reason 最多 500 个字符。")
      }
      reason = normalized.length > 0 ? normalized : null
    } else {
      return fail("VALIDATION_FAILED", "reason 必须是字符串或 null。")
    }
  }

  return ok({
    action: shape.data.action as AdminLearningPathStatusAction,
    reason,
  })
}

const adminSettingsAccountStatusShapeSchema = z
  .object({
    action: z.string(),
    reason: z.unknown().optional(),
  })
  .strict()

export function parseAdminSettingsAccountStatusBody(
  input: unknown,
): ValidationResult<AdminUpdateAdminAccountStatusRequest> {
  const shape = adminSettingsAccountStatusShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "管理员账号状态更新请求体不合法。")
  }

  if (!ADMIN_SETTINGS_ACCOUNT_STATUS_ACTIONS.includes(shape.data.action as AdminSettingsAccountStatusAction)) {
    return fail("VALIDATION_FAILED", "action 参数不合法。")
  }

  let reason: string | null | undefined
  if (shape.data.reason !== undefined) {
    if (shape.data.reason === null) {
      reason = null
    } else if (typeof shape.data.reason === "string") {
      const normalized = shape.data.reason.trim()
      if (normalized.length > 500) {
        return fail("VALIDATION_FAILED", "reason 最多 500 个字符。")
      }
      reason = normalized.length > 0 ? normalized : null
    } else {
      return fail("VALIDATION_FAILED", "reason 必须是字符串或 null。")
    }
  }

  return ok({
    action: shape.data.action as AdminSettingsAccountStatusAction,
    reason,
  })
}

const SITE_CONTACT_CHANNEL_TYPES = ["wechat", "douyin"] as const

function parseSiteContactChannels(value: unknown): ValidationResult<ContactChannelConfig[]> {
  if (!Array.isArray(value)) {
    return fail("VALIDATION_FAILED", "contactChannels 必须是数组。")
  }

  const parsed: ContactChannelConfig[] = []
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return fail("VALIDATION_FAILED", "contactChannels 中存在不合法对象。")
    }

    const row = item as Record<string, unknown>
    const title = parseTrimmedRequiredString(row.title, "contactChannels.title", 1, 50)
    const handle = parseTrimmedRequiredString(row.handle, "contactChannels.handle", 1, 100)
    const summary = parseTrimmedRequiredString(row.summary, "contactChannels.summary", 1, 200)
    const qrLabel = parseTrimmedRequiredString(row.qrLabel, "contactChannels.qrLabel", 1, 50)

    if (!title.ok || !handle.ok || !summary.ok || !qrLabel.ok) {
      return fail("VALIDATION_FAILED", "contactChannels 字段不合法。")
    }

    if (typeof row.type !== "string" || !SITE_CONTACT_CHANNEL_TYPES.includes(row.type as (typeof SITE_CONTACT_CHANNEL_TYPES)[number])) {
      return fail("VALIDATION_FAILED", "contactChannels.type 不合法。")
    }

    let qrSeed: number | undefined
    if (row.qrSeed !== undefined && row.qrSeed !== null) {
      if (typeof row.qrSeed !== "number" || !Number.isInteger(row.qrSeed) || row.qrSeed < 0) {
        return fail("VALIDATION_FAILED", "contactChannels.qrSeed 必须是非负整数。")
      }
      qrSeed = row.qrSeed
    }

    let qrImageUrl: string | null | undefined
    if (row.qrImageUrl !== undefined) {
      if (row.qrImageUrl === null) {
        qrImageUrl = null
      } else if (typeof row.qrImageUrl === "string") {
        const normalizedQrImageUrl = row.qrImageUrl.trim()
        if (normalizedQrImageUrl.length > 0 && !isValidUrl(normalizedQrImageUrl)) {
          return fail("VALIDATION_FAILED", "contactChannels.qrImageUrl 必须是合法 URL。")
        }
        qrImageUrl = normalizedQrImageUrl.length > 0 ? normalizedQrImageUrl : null
      } else {
        return fail("VALIDATION_FAILED", "contactChannels.qrImageUrl 必须是字符串或 null。")
      }
    }

    parsed.push({
      title: title.data,
      handle: handle.data,
      summary: summary.data,
      qrLabel: qrLabel.data,
      ...(qrSeed !== undefined ? { qrSeed } : {}),
      ...(qrImageUrl !== undefined ? { qrImageUrl } : {}),
      type: row.type as ContactChannelConfig["type"],
    })
  }

  return ok(parsed)
}

export function parseAdminSettingsContactBody(
  input: unknown,
): ValidationResult<UpdateSiteContactRequest> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("BAD_REQUEST", "联系方式请求体不合法。")
  }

  const body = input as Record<string, unknown>
  const data: UpdateSiteContactRequest = {}

  if (body.companyName !== undefined) {
    const companyName = parseTrimmedRequiredString(body.companyName, "companyName", 1, 200)
    if (!companyName.ok) {
      return fail("VALIDATION_FAILED", "companyName 不合法。")
    }
    data.companyName = companyName.data
  }

  if (body.address !== undefined) {
    const address = parseTrimmedRequiredString(body.address, "address", 1, 500)
    if (!address.ok) {
      return fail("VALIDATION_FAILED", "address 不合法。")
    }
    data.address = address.data
  }

  if (body.website !== undefined) {
    const website = parseTrimmedRequiredString(body.website, "website", 1, 255)
    if (!website.ok || !isValidUrl(website.data)) {
      return fail("VALIDATION_FAILED", "website 必须是 http(s) 链接。")
    }
    data.website = website.data
  }

  if (body.contactEmail !== undefined) {
    const contactEmail = parseTrimmedRequiredString(body.contactEmail, "contactEmail", 3, 255)
    if (!contactEmail.ok || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.data)) {
      return fail("VALIDATION_FAILED", "contactEmail 格式不正确。")
    }
    data.contactEmail = contactEmail.data
  }

  if (body.serviceHours !== undefined) {
    const serviceHours = parseTrimmedRequiredString(body.serviceHours, "serviceHours", 1, 100)
    if (!serviceHours.ok) {
      return fail("VALIDATION_FAILED", "serviceHours 不合法。")
    }
    data.serviceHours = serviceHours.data
  }

  if (body.contactChannels !== undefined) {
    const channels = parseSiteContactChannels(body.contactChannels)
    if (!channels.ok) {
      return channels
    }
    data.contactChannels = channels.data
  }

  if (Object.keys(data).length === 0) {
    return fail("VALIDATION_FAILED", "请至少提供一个要更新的字段。")
  }

  return ok(data)
}

const adminUserSoftDeleteShapeSchema = z.object({
  reason: z.unknown().optional(),
})

export function parseAdminUserSoftDeleteBody(input: unknown): ValidationResult<{ reason?: string | null }> {
  if (input === null || input === undefined || (typeof input === "object" && Object.keys(input as object).length === 0)) {
    return ok({})
  }

  const shape = adminUserSoftDeleteShapeSchema.safeParse(input)

  if (!shape.success) {
    return fail("BAD_REQUEST", "软删除请求体不合法。")
  }

  const reasonRaw = shape.data.reason

  if (reasonRaw === undefined) {
    return ok({})
  }

  if (reasonRaw === null) {
    return ok({ reason: null })
  }

  if (typeof reasonRaw !== "string") {
    return fail("VALIDATION_FAILED", "reason 必须是字符串。")
  }

  const reason = reasonRaw.trim()

  if (reason.length > 500) {
    return fail("VALIDATION_FAILED", "reason 最多 500 个字符。")
  }

  return ok({ reason: reason.length > 0 ? reason : null })
}

export function parseOnboardingPathOptionsQuery(searchParams: URLSearchParams): ValidationResult<{
  toolCode: string
  learningLevel: Level
}> {
  const toolCode = searchParams.get("toolCode")?.trim() || null
  const learningLevel = searchParams.get("learningLevel")

  if (
    !toolCode
    || (
      learningLevel !== "beginner"
      && learningLevel !== "intermediate"
      && learningLevel !== "advanced"
    )
  ) {
    return fail("BAD_REQUEST", "缺少合法的 toolCode 或 learningLevel。")
  }

  return ok({
    toolCode,
    learningLevel: learningLevel as Level,
  })
}

export function parseRequiredRouteId(
  id: string | null | undefined,
  message: string,
) {
  const normalized = typeof id === "string" ? id.trim() : ""

  if (!normalized) {
    return fail("BAD_REQUEST", message)
  }

  return ok(normalized)
}

const PLAN_FROM_MATERIAL_MAX_LINKS = 1
const PLAN_FROM_MATERIAL_ERROR_CODES = {
  linksNotArray: "MATERIAL_LINKS_NOT_ARRAY",
  linksMustBeSingle: "MATERIAL_SINGLE_LINK_ONLY",
  linkNotString: "MATERIAL_LINK_NOT_STRING",
  linkEmpty: "MATERIAL_LINK_EMPTY",
  linkInvalidUrl: "MATERIAL_LINK_INVALID_URL",
} as const

function parseMaterialLinkArray(
  links: unknown,
  fieldLabel: string,
): ValidationResult<string[]> {
  if (!Array.isArray(links)) {
    return fail(
      PLAN_FROM_MATERIAL_ERROR_CODES.linksNotArray,
      `${fieldLabel} 必须是字符串数组。`,
    )
  }

  const normalized: string[] = []

  for (const item of links) {
    if (typeof item !== "string") {
      return fail(
        PLAN_FROM_MATERIAL_ERROR_CODES.linkNotString,
        `${fieldLabel} 仅支持字符串 URL。`,
      )
    }

    const trimmed = item.trim()

    if (!trimmed) {
      return fail(
        PLAN_FROM_MATERIAL_ERROR_CODES.linkEmpty,
        `${fieldLabel} 不能为空字符串。`,
      )
    }

    if (!isValidUrl(trimmed)) {
      return fail(
        PLAN_FROM_MATERIAL_ERROR_CODES.linkInvalidUrl,
        `${fieldLabel} 含非法 URL。`,
      )
    }

    normalized.push(trimmed)
  }

  const deduped = [...new Set(normalized)]
  if (deduped.length !== PLAN_FROM_MATERIAL_MAX_LINKS) {
    return fail(
      PLAN_FROM_MATERIAL_ERROR_CODES.linksMustBeSingle,
      `${fieldLabel} 仅支持 1 条教程链接。`,
    )
  }

  return ok(deduped)
}

export function parsePlanFromMaterialBody(input: unknown): ValidationResult<{
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}> {
  if (!input || typeof input !== "object") {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象。")
  }

  const body = input as Record<string, unknown>
  const linksResult = parseMaterialLinkArray(body.links, "links")

  if (!linksResult.ok) {
    return linksResult
  }

  let userGoal: string | null | undefined
  if (body.userGoal !== undefined && body.userGoal !== null) {
    if (typeof body.userGoal !== "string") {
      return fail("BAD_REQUEST", "userGoal 必须是字符串。")
    }
    const trimmed = body.userGoal.trim()
    userGoal = trimmed.length > 0 ? trimmed : null
  }

  let weeklyHours: number | null | undefined
  if (body.weeklyHours !== undefined && body.weeklyHours !== null) {
    if (typeof body.weeklyHours !== "number" || !Number.isInteger(body.weeklyHours)) {
      return fail("BAD_REQUEST", "weeklyHours 必须是整数。")
    }
    if (body.weeklyHours < 1 || body.weeklyHours > 40) {
      return fail("VALIDATION_FAILED", "weeklyHours 必须在 1 到 40 之间。")
    }
    weeklyHours = body.weeklyHours
  }

  let currentConstraints: string | null | undefined
  if (body.currentConstraints !== undefined && body.currentConstraints !== null) {
    if (typeof body.currentConstraints !== "string") {
      return fail("BAD_REQUEST", "currentConstraints 必须是字符串。")
    }
    const trimmed = body.currentConstraints.trim()
    currentConstraints = trimmed.length > 0 ? trimmed : null
  }

  return ok({
    links: linksResult.data,
    userGoal,
    weeklyHours,
    currentConstraints,
  })
}

export function parsePlanDraftRegenerateBody(input: unknown): ValidationResult<{
  links?: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}> {
  if (input === null || input === undefined) {
    return ok({})
  }

  if (typeof input !== "object") {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象。")
  }

  const body = input as Record<string, unknown>
  let links: string[] | undefined

  if (body.links !== undefined) {
    const linksResult = parseMaterialLinkArray(body.links, "links")
    if (!linksResult.ok) {
      return linksResult
    }
    links = linksResult.data
  }

  let userGoal: string | null | undefined
  if (body.userGoal !== undefined && body.userGoal !== null) {
    if (typeof body.userGoal !== "string") {
      return fail("BAD_REQUEST", "userGoal 必须是字符串。")
    }
    const trimmed = body.userGoal.trim()
    userGoal = trimmed.length > 0 ? trimmed : null
  }

  let weeklyHours: number | null | undefined
  if (body.weeklyHours !== undefined && body.weeklyHours !== null) {
    if (typeof body.weeklyHours !== "number" || !Number.isInteger(body.weeklyHours)) {
      return fail("BAD_REQUEST", "weeklyHours 必须是整数。")
    }
    if (body.weeklyHours < 1 || body.weeklyHours > 40) {
      return fail("VALIDATION_FAILED", "weeklyHours 必须在 1 到 40 之间。")
    }
    weeklyHours = body.weeklyHours
  }

  let currentConstraints: string | null | undefined
  if (body.currentConstraints !== undefined && body.currentConstraints !== null) {
    if (typeof body.currentConstraints !== "string") {
      return fail("BAD_REQUEST", "currentConstraints 必须是字符串。")
    }
    const trimmed = body.currentConstraints.trim()
    currentConstraints = trimmed.length > 0 ? trimmed : null
  }

  const data: {
    links?: string[]
    userGoal?: string | null
    weeklyHours?: number | null
    currentConstraints?: string | null
  } = {}

  if (links !== undefined) {
    data.links = links
  }
  if (userGoal !== undefined) {
    data.userGoal = userGoal
  }
  if (weeklyHours !== undefined) {
    data.weeklyHours = weeklyHours
  }
  if (currentConstraints !== undefined) {
    data.currentConstraints = currentConstraints
  }

  return ok(data)
}

export function parsePlanDraftIdParam(id: string | null | undefined) {
  const normalized = normalizeUuid(typeof id === "string" ? id.trim() : "")

  if (!normalized) {
    return fail("BAD_REQUEST", "学习计划草稿 ID 不合法。")
  }

  return ok(normalized)
}

export function parseMaterialIntakeIdParam(id: string | null | undefined) {
  const normalized = normalizeUuid(typeof id === "string" ? id.trim() : "")

  if (!normalized) {
    return fail("BAD_REQUEST", "材料摄取 ID 不合法。")
  }

  return ok(normalized)
}

export function parsePlanDraftTaskIdParam(id: string | null | undefined) {
  const normalized = normalizeUuid(typeof id === "string" ? id.trim() : "")

  if (!normalized) {
    return fail("BAD_REQUEST", "学习计划草稿任务 ID 不合法。")
  }

  return ok(normalized)
}

export function parsePlanDraftPatchBody(input: unknown): ValidationResult<{
  title?: string | null
  goal?: string | null
  tasks?: Array<{
    id: string
    title?: string | null
    objective?: string | null
    practiceSteps?: string[]
    acceptanceCriteria?: string | null
    estimatedMinutes?: number | null
    recommendedForWeek1?: boolean
    masteryPoints?: string[]
    cautions?: Array<{ text: string; isTrap?: boolean }>
  }>
}> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象。")
  }

  const body = input as Record<string, unknown>
  const data: {
    title?: string | null
    goal?: string | null
    tasks?: Array<{
      id: string
      title?: string | null
      objective?: string | null
      practiceSteps?: string[]
      acceptanceCriteria?: string | null
      estimatedMinutes?: number | null
      recommendedForWeek1?: boolean
      masteryPoints?: string[]
      cautions?: Array<{ text: string; isTrap?: boolean }>
    }>
  } = {}

  if (body.title !== undefined) {
    if (body.title !== null && typeof body.title !== "string") {
      return fail("BAD_REQUEST", "title 必须是字符串。")
    }
    data.title = typeof body.title === "string" ? body.title.trim() || null : null
  }

  if (body.goal !== undefined) {
    if (body.goal !== null && typeof body.goal !== "string") {
      return fail("BAD_REQUEST", "goal 必须是字符串。")
    }
    data.goal = typeof body.goal === "string" ? body.goal.trim() || null : null
  }

  if (body.tasks !== undefined) {
    if (!Array.isArray(body.tasks)) {
      return fail("BAD_REQUEST", "tasks 必须是数组。")
    }
    const tasks: Array<{
      id: string
      title?: string | null
      objective?: string | null
      practiceSteps?: string[]
      acceptanceCriteria?: string | null
      estimatedMinutes?: number | null
      recommendedForWeek1?: boolean
      masteryPoints?: string[]
      cautions?: Array<{ text: string; isTrap?: boolean }>
    }> = []

    for (const item of body.tasks) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return fail("BAD_REQUEST", "tasks 中存在不合法对象。")
      }

      const task = item as Record<string, unknown>
      const id = normalizeUuid(typeof task.id === "string" ? task.id.trim() : "")
      if (!id) {
        return fail("VALIDATION_FAILED", "tasks 中存在不合法任务 ID。")
      }

      if (task.estimatedMinutes !== undefined && task.estimatedMinutes !== null) {
        if (typeof task.estimatedMinutes !== "number" || !Number.isInteger(task.estimatedMinutes)) {
          return fail("BAD_REQUEST", "estimatedMinutes 必须是整数。")
        }
        if (task.estimatedMinutes < 15 || task.estimatedMinutes > 240) {
          return fail("VALIDATION_FAILED", "estimatedMinutes 必须在 15 到 240 之间。")
        }
      }

      if (task.practiceSteps !== undefined) {
        if (
          !Array.isArray(task.practiceSteps)
          || task.practiceSteps.some((step) => typeof step !== "string" || step.trim().length === 0)
        ) {
          return fail("VALIDATION_FAILED", "practiceSteps 必须是非空字符串数组。")
        }
        if (task.practiceSteps.length < 1) {
          return fail("VALIDATION_FAILED", "practiceSteps 至少保留 1 条。")
        }
      }

      if (task.recommendedForWeek1 !== undefined && typeof task.recommendedForWeek1 !== "boolean") {
        return fail("BAD_REQUEST", "recommendedForWeek1 必须是布尔值。")
      }

      const normalizedTask: {
        id: string
        title?: string | null
        objective?: string | null
        practiceSteps?: string[]
        acceptanceCriteria?: string | null
        estimatedMinutes?: number | null
        recommendedForWeek1?: boolean
        masteryPoints?: string[]
        cautions?: Array<{ text: string; isTrap?: boolean }>
      } = { id }

      if (task.title !== undefined) {
        if (task.title !== null && typeof task.title !== "string") {
          return fail("BAD_REQUEST", "title 必须是字符串。")
        }
        normalizedTask.title = typeof task.title === "string" ? task.title.trim() || null : null
      }

      if (task.objective !== undefined) {
        if (task.objective !== null && typeof task.objective !== "string") {
          return fail("BAD_REQUEST", "objective 必须是字符串。")
        }
        normalizedTask.objective =
          typeof task.objective === "string" ? task.objective.trim() || null : null
      }

      if (task.practiceSteps !== undefined) {
        normalizedTask.practiceSteps = (task.practiceSteps as string[]).map((step) => step.trim())
      }

      if (task.acceptanceCriteria !== undefined) {
        if (task.acceptanceCriteria !== null && typeof task.acceptanceCriteria !== "string") {
          return fail("BAD_REQUEST", "acceptanceCriteria 必须是字符串。")
        }
        normalizedTask.acceptanceCriteria =
          typeof task.acceptanceCriteria === "string"
            ? task.acceptanceCriteria.trim() || null
            : null
      }

      if (task.estimatedMinutes !== undefined) {
        normalizedTask.estimatedMinutes =
          typeof task.estimatedMinutes === "number" ? task.estimatedMinutes : null
      }

      if (task.recommendedForWeek1 !== undefined) {
        normalizedTask.recommendedForWeek1 = task.recommendedForWeek1 as boolean
      }

      if (task.masteryPoints !== undefined) {
        if (
          !Array.isArray(task.masteryPoints)
          || task.masteryPoints.some((p) => typeof p !== "string" || p.trim().length === 0)
        ) {
          return fail("VALIDATION_FAILED", "masteryPoints 必须是非空字符串数组。")
        }
        if (task.masteryPoints.length < 2) {
          return fail("VALIDATION_FAILED", "masteryPoints 至少保留 2 条。")
        }
        normalizedTask.masteryPoints = (task.masteryPoints as string[]).map((p) => p.trim())
      }

      if (task.cautions !== undefined) {
        if (!Array.isArray(task.cautions)) {
          return fail("BAD_REQUEST", "cautions 必须是数组。")
        }
        if (task.cautions.length < 1) {
          return fail("VALIDATION_FAILED", "cautions 至少保留 1 条。")
        }
        const cautions: Array<{ text: string; isTrap?: boolean }> = []
        for (const entry of task.cautions) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return fail("BAD_REQUEST", "cautions 中存在不合法对象。")
          }
          const row = entry as Record<string, unknown>
          if (typeof row.text !== "string" || row.text.trim().length === 0) {
            return fail("VALIDATION_FAILED", "cautions 中 text 必须是非空字符串。")
          }
          if (row.isTrap !== undefined && typeof row.isTrap !== "boolean") {
            return fail("BAD_REQUEST", "cautions 中 isTrap 必须是布尔值。")
          }
          cautions.push({
            text: row.text.trim(),
            ...(typeof row.isTrap === "boolean" ? { isTrap: row.isTrap } : {}),
          })
        }
        normalizedTask.cautions = cautions
      }

      tasks.push(normalizedTask)
    }

    data.tasks = tasks
  }

  return ok(data)
}

export function parseProfileAvatarFile(file: unknown): ValidationResult<File> {
  if (!(file instanceof File)) {
    return fail("BAD_REQUEST", "请先选择要上传的头像图片。")
  }

  if (!PROFILE_AVATAR_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ALLOWED_TYPES)[number])) {
    return fail("VALIDATION_FAILED", "头像仅支持 JPG、PNG、WebP 格式。")
  }

  if (file.size <= 0) {
    return fail("VALIDATION_FAILED", "头像文件为空，请重新选择。")
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return fail("VALIDATION_FAILED", "头像图片不能超过 2MB。")
  }

  return ok(file)
}
