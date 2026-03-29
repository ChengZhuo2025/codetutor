import type { NextRequest } from "next/server"
import type { AuthLoginRequest } from "@/lib/api/contracts/auth"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { finalizeAuthLogin } from "@/server/modules/auth/service"

function isAuthLoginRequest(input: unknown): input is AuthLoginRequest {
  if (!input || typeof input !== "object") {
    return false
  }

  const record = input as Record<string, unknown>
  return record.loginType === "phone" || record.loginType === "wechat"
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth?.user) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()

    if (!isAuthLoginRequest(body)) {
      return fail("BAD_REQUEST", "loginType 不合法。", 400)
    }

    const data = await finalizeAuthLogin(auth.user, body.loginType)

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "登录流程处理失败",
      500,
    )
  }
}
