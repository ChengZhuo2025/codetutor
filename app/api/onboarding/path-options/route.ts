import type { NextRequest } from "next/server"
import { VALID_LEARNING_LEVELS } from "@/constants/learning-taxonomy"
import { ok, fail } from "@/server/lib/api-response"
import { getOnboardingPathOptionsData } from "@/server/modules/onboarding/service"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const toolCode = searchParams.get("toolCode")
    const learningLevel = searchParams.get("learningLevel")

    if (!toolCode || !learningLevel || !VALID_LEARNING_LEVELS.has(learningLevel)) {
      return fail("BAD_REQUEST", "缺少合法的 toolCode 或 learningLevel。", 400)
    }

    const data = await getOnboardingPathOptionsData(
      toolCode,
      learningLevel as "beginner" | "intermediate" | "advanced",
    )

    if (!data) {
      return fail("NOT_FOUND", "未找到对应的工具或路径选项。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载路径选项失败",
      500,
    )
  }
}
