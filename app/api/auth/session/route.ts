import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { isUserAccountDisabledError } from "@/server/lib/user-account-disabled"
import { getAuthSessionSummary } from "@/server/modules/auth/service"

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return withNoStoreHeaders(fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401))
    }

    const data = await getAuthSessionSummary(auth.userId)

    return withNoStoreHeaders(ok(data))
  } catch (error) {
    if (isUserAccountDisabledError(error)) {
      return withNoStoreHeaders(fail(error.code, error.message, 403))
    }
    return withNoStoreHeaders(
      fail(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "加载当前登录状态失败",
        500,
      ),
    )
  }
}
