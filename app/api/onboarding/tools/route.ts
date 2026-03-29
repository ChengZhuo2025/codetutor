import { ok, fail } from "@/server/lib/api-response"
import { getOnboardingToolsData } from "@/server/modules/onboarding/service"

export async function GET() {
  try {
    const data = await getOnboardingToolsData()
    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "加载工具列表失败",
      500,
    )
  }
}
