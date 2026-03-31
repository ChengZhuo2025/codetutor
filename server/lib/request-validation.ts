import { z } from "zod"
import { FEEDBACK_SOURCES, FEEDBACK_STATUSES, FEEDBACK_TYPES, type AdminReplyFeedbackRequest, type AdminUpdateFeedbackStatusRequest, type CreateFeedbackRequest, type FeedbackStatus, type FeedbackType } from "@/lib/api/contracts/feedback"
import type { AuthLoginType } from "@/lib/api/contracts/auth"
import type { UpdateLearningHistoryStatusRequest } from "@/lib/api/contracts/history"
import type { CompleteOnboardingRequest } from "@/lib/api/contracts/onboarding"
import type { CompleteTaskRequest, UpdateTaskStatusRequest } from "@/lib/api/contracts/task"
import { normalizeUuid } from "@/server/lib/identifiers"
import type { HistoryFilter } from "@/features/history/types"
import type { Level } from "@/features/onboarding/types"
import { PROFILE_AVATAR_ALLOWED_TYPES, PROFILE_AVATAR_MAX_BYTES } from "@/lib/supabase/storage"

type ValidationSuccess<T> = {
  ok: true
  data: T
}

type ValidationFailure = {
  ok: false
  code: "BAD_REQUEST" | "VALIDATION_FAILED"
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

  if (shape.data.loginType !== "phone" && shape.data.loginType !== "wechat") {
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
  const rawLimit = searchParams.get("limit")

  const status: FeedbackStatus | null =
    rawStatus && FEEDBACK_STATUSES.includes(rawStatus as (typeof FEEDBACK_STATUSES)[number])
      ? (rawStatus as FeedbackStatus)
      : null

  const feedbackType: FeedbackType | null =
    rawFeedbackType && FEEDBACK_TYPES.includes(rawFeedbackType as (typeof FEEDBACK_TYPES)[number])
      ? (rawFeedbackType as FeedbackType)
      : null

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 50

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return fail("VALIDATION_FAILED", "limit 必须在 1 到 100 之间。")
  }

  if (rawStatus && !status) {
    return fail("VALIDATION_FAILED", "status 参数不合法。")
  }

  if (rawFeedbackType && !feedbackType) {
    return fail("VALIDATION_FAILED", "feedbackType 参数不合法。")
  }

  return ok({
    status: status ?? undefined,
    feedbackType: feedbackType ?? undefined,
    keyword: searchParams.get("keyword")?.trim() || undefined,
    userId: searchParams.get("userId")?.trim() || undefined,
    limit,
  })
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
