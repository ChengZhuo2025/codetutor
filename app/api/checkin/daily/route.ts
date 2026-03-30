import type { NextRequest } from "next/server"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createDailyCheckin } from "@/server/modules/checkins/service"

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const data = await createDailyCheckin(auth.userId)

    if (!data) {
      return fail("NOT_FOUND", "当前用户档案不存在，无法完成打卡。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "每日打卡失败",
      500,
    )
  }
}
