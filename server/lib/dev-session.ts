import type { NextRequest } from "next/server"

const DEV_USER_ID_HEADER = "x-dev-user-id"

export function getDevUserId(request: NextRequest): string | null {
  const fromHeader = request.headers.get(DEV_USER_ID_HEADER)

  if (fromHeader) {
    return fromHeader
  }

  return process.env.DEV_SUPABASE_USER_ID ?? null
}

export function getDevUserIdHelpText() {
  return `请在本地 .env 中配置 DEV_SUPABASE_USER_ID，或在请求头中传入 ${DEV_USER_ID_HEADER}。`
}
