import type { NextRequest } from "next/server"
import { ok, fail } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { completeOnboarding } from "@/server/modules/onboarding/service"
import type { CompleteOnboardingRequest } from "@/lib/api/contracts/onboarding"

const VALID_LEVELS = new Set(["beginner", "intermediate", "advanced"])
const VALID_SELECTION_MODES = new Set(["self_directed", "preset_training"])

function isCompleteRequest(input: unknown): input is CompleteOnboardingRequest {
  if (!input || typeof input !== "object") {
    return false
  }

  const record = input as Record<string, unknown>

  return (
    typeof record.toolCode === "string" &&
    typeof record.learningLevel === "string" &&
    typeof record.selectionMode === "string"
  )
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const body = await request.json()

    if (!isCompleteRequest(body)) {
      return fail("BAD_REQUEST", "请求体格式不正确。", 400)
    }

    if (
      !VALID_LEVELS.has(body.learningLevel) ||
      !VALID_SELECTION_MODES.has(body.selectionMode)
    ) {
      return fail("VALIDATION_FAILED", "learningLevel 或 selectionMode 不合法。", 422)
    }

    const data = await completeOnboarding(auth.userId, body)

    if (!data) {
      return fail("NOT_FOUND", "未找到对应的工具或路径模板。", 404)
    }

    return ok(data)
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "保存你的选择失败，请稍后重试。",
      500,
    )
  }
}
