import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const DEV_USER_ID_HEADER = "x-dev-user-id"

export type RequestAuthResult = {
  userId: string
  user?: User
  source: "supabase" | "dev"
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()
  return token || null
}

export async function getRequestAuth(
  request: NextRequest,
): Promise<RequestAuthResult | null> {
  const accessToken = getBearerToken(request)

  if (accessToken) {
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
    }
  }

  const devUserId =
    request.headers.get(DEV_USER_ID_HEADER) ?? process.env.DEV_SUPABASE_USER_ID ?? null

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
