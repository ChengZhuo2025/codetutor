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
import type { UpdateLearningHistoryStatusRequest } from "@/lib/api/contracts/history"
import type { CompleteOnboardingRequest } from "@/lib/api/contracts/onboarding"
import type { CompleteTaskRequest, UpdateTaskStatusRequest } from "@/lib/api/contracts/task"
import type { AdminUpdateUserRequest } from "@/lib/api/contracts/admin-users"
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

const PLAN_FROM_MATERIAL_MAX_LINKS = 5

function parseMaterialLinkArray(
  links: unknown,
  fieldLabel: string,
): ValidationResult<string[]> {
  if (!Array.isArray(links)) {
    return fail("BAD_REQUEST", `${fieldLabel} 必须是字符串数组。`)
  }

  if (links.length === 0 || links.length > PLAN_FROM_MATERIAL_MAX_LINKS) {
    return fail(
      "VALIDATION_FAILED",
      `${fieldLabel} 数量必须在 1 到 ${PLAN_FROM_MATERIAL_MAX_LINKS} 之间。`,
    )
  }

  const normalized: string[] = []

  for (const item of links) {
    if (typeof item !== "string") {
      return fail("VALIDATION_FAILED", `${fieldLabel} 仅支持字符串 URL。`)
    }

    const trimmed = item.trim()

    if (!trimmed) {
      return fail("VALIDATION_FAILED", `${fieldLabel} 不能为空字符串。`)
    }

    if (!isValidUrl(trimmed)) {
      return fail("VALIDATION_FAILED", `${fieldLabel} 含非法 URL。`)
    }

    normalized.push(trimmed)
  }

  return ok([...new Set(normalized)])
}

export function parsePlanFromMaterialBody(input: unknown): ValidationResult<{
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
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

  return ok({
    links: linksResult.data,
    userGoal,
    weeklyHours,
  })
}

export function parsePlanDraftRegenerateBody(input: unknown): ValidationResult<{
  links?: string[]
  userGoal?: string | null
  weeklyHours?: number | null
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

  const data: {
    links?: string[]
    userGoal?: string | null
    weeklyHours?: number | null
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

  return ok(data)
}

export function parsePlanDraftIdParam(id: string | null | undefined) {
  const normalized = normalizeUuid(typeof id === "string" ? id.trim() : "")

  if (!normalized) {
    return fail("BAD_REQUEST", "学习计划草稿 ID 不合法。")
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
