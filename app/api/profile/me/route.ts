import type { NextRequest } from "next/server"
import type { UpdateProfileMeRequest } from "@/lib/api/contracts/auth"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { getProfileMe, updateProfileMe } from "@/server/modules/auth/service"

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseUpdateProfileRequest(input: unknown): UpdateProfileMeRequest | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const record = input as Record<string, unknown>

  if (typeof record.nickname !== "string") {
    return null
  }

  return {
    nickname: record.nickname,
    avatarUrl: normalizeOptionalString(record.avatarUrl),
    email: normalizeOptionalString(record.email),
    wechat: normalizeOptionalString(record.wechat),
    bio: normalizeOptionalString(record.bio),
  }
}

function validateUpdateProfileRequest(input: UpdateProfileMeRequest) {
  const nickname = input.nickname.trim()

  if (nickname.length < 2) {
    return "昵称至少需要 2 个字符。"
  }

  if (nickname.length > 24) {
    return "昵称最多 24 个字符。"
  }

  if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
    return "头像链接格式不正确，请填写以 http:// 或 https:// 开头的图片地址。"
  }

  if (input.avatarUrl && input.avatarUrl.length > 500) {
    return "头像链接过长，请换一个更短的地址。"
  }

  if (input.wechat && input.wechat.length > 64) {
    return "微信号最多 64 个字符。"
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "邮箱格式不正确，请检查后重试。"
  }

  if (input.bio && input.bio.length > 300) {
    return "个人简介最多 300 个字符。"
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const data = await getProfileMe(auth.userId)

    if (!data) {
      return fail("NOT_FOUND", "当前用户档案不存在。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载用户档案失败",
      500,
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()
    const input = parseUpdateProfileRequest(body)

    if (!input) {
      return fail("BAD_REQUEST", "个人资料请求体不合法。", 400)
    }

    const validationError = validateUpdateProfileRequest(input)

    if (validationError) {
      return fail("VALIDATION_FAILED", validationError, 400)
    }

    const data = await updateProfileMe(auth.userId, input)

    if (!data) {
      return fail("NOT_FOUND", "当前用户档案不存在。", 404)
    }

    return ok(data, "profile updated")
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "保存用户档案失败",
      500,
    )
  }
}
