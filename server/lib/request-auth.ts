import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { performance } from "node:perf_hooks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { markAuthCacheStatus, recordServerTiming } from "@/server/lib/observability"
import { getBearerTokenFromHeaders, hashSensitiveValue } from "@/server/lib/request-fingerprint"
import { createRuntimeCache } from "@/server/lib/runtime-cache"

const DEV_USER_ID_HEADER = "x-dev-user-id"
const AUTH_CACHE_TTL_MS = 60_000

const requestAuthCache = createRuntimeCache<RequestAuthResult | null>({
  name: "request-auth",
  ttlMs: AUTH_CACHE_TTL_MS,
  maxEntries: 500,
})

export type RequestAuthResult = {
  userId: string
  user?: User
  source: "supabase" | "dev" | "admin_session"
}

export async function getRequestAuth(
  request: NextRequest,
): Promise<RequestAuthResult | null> {
  const accessToken = getBearerTokenFromHeaders(request.headers)

  if (accessToken) {
    const tokenHash = hashSensitiveValue(accessToken)
    const startedAt = performance.now()
    const cached = await requestAuthCache.getOrLoadDetailed(tokenHash, async () => {
      const supabase = createSupabaseAdminClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken)

      if (error || !user) {
        return null
      }

      return {
        userId: user.id,
        user,
        source: "supabase",
      } satisfies RequestAuthResult
    })

    markAuthCacheStatus(cached.status)
    recordServerTiming("auth_user_lookup", performance.now() - startedAt)
    return cached.value
  }

  markAuthCacheStatus("skip")

  if (process.env.NODE_ENV === "production") {
    return null
  }

  const devUserId = request.headers.get(DEV_USER_ID_HEADER)

  if (!devUserId) {
    return null
  }

  return {
    userId: devUserId,
    source: "dev",
  }
}

export function getRequestAuthHelpText() {
  return "请先通过 Supabase Auth 完成登录，或在开发环境配置 DEV_SUPABASE_USER_ID。"
}

export function clearRequestAuthCache(accessToken: string | null | undefined) {
  const normalized = accessToken?.trim()
  if (!normalized) {
    return
  }

  requestAuthCache.delete(hashSensitiveValue(normalized))
}

/**
 * 用于 /api/profile/*：在 Bearer / dev header 之后，接受管理后台 HttpOnly Cookie 会话。
 */
export async function getRequestAuthIncludingAdminCookie(
  request: NextRequest,
): Promise<RequestAuthResult | null> {
  const primary = await getRequestAuth(request)

  if (primary) {
    return primary
  }

  const { getAdminSessionFromRequest } = await import("@/server/modules/admin-auth/service.ts")
  const adminSession = await getAdminSessionFromRequest(request)

  if (!adminSession || adminSession.status !== "active") {
    return null
  }

  return {
    userId: adminSession.userId,
    source: "admin_session",
  }
}

export function getRequestAuthForProfileHelpText() {
  return "请先通过 Supabase Auth 登录并携带 Bearer Token，或使用已登录的管理后台（Cookie），或在开发环境配置 x-dev-user-id。"
}

export async function getRequestAuthFromAdminSession(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const { getAdminSessionFromRequest } = await import("@/server/modules/admin-auth/service.ts")
  const adminSession = await getAdminSessionFromRequest(request)

  if (!adminSession || adminSession.status !== "active") {
    return null
  }

  return { userId: adminSession.userId }
}

export function getRequestAuthForAdminProfileHelpText() {
  return "请先登录管理后台后再操作管理员资料。"
}
