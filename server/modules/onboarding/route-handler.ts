import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponseData,
  GetOnboardingPathOptionsResponseData,
} from "../../../lib/api/contracts/onboarding.ts"
import type { Level } from "../../../features/onboarding/types.ts"
import {
  jsonOnboardingPathOptionsNotFound,
  jsonOnboardingTemplateNotFound,
} from "../../lib/route-error-presets.ts"
import { jsonInternalErrorFromError } from "../../lib/route-error.ts"
import { jsonAuthRequired, jsonError, jsonSuccess } from "../../lib/route-response.ts"
import {
  parseCompleteOnboardingBody,
  parseOnboardingPathOptionsQuery,
} from "../../lib/request-validation.ts"

type RequestLike = {
  json: () => Promise<unknown>
  url: string
}

export function createCompleteOnboardingPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  completeOnboarding: (
    userId: string,
    request: CompleteOnboardingRequest,
  ) => Promise<CompleteOnboardingResponseData | null>
}) {
  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseCompleteOnboardingBody(await request.json())

      if (!input.ok) {
        return jsonError(
          input.code,
          input.message,
          input.code === "BAD_REQUEST" ? 400 : 422,
        )
      }

      const data = await dependencies.completeOnboarding(auth.userId, input.data)

      if (!data) {
        return jsonOnboardingTemplateNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "保存你的选择失败，请稍后重试。")
    }
  }
}

export function createOnboardingPathOptionsGetHandler(dependencies: {
  getOnboardingPathOptionsData: (
    toolCode: string,
    learningLevel: Level,
  ) => Promise<GetOnboardingPathOptionsResponseData | null>
}) {
  return async function GET(request: Pick<RequestLike, "url">) {
    try {
      const searchParams = new URL(request.url).searchParams
      const input = parseOnboardingPathOptionsQuery(searchParams)

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.getOnboardingPathOptionsData(
        input.data.toolCode,
        input.data.learningLevel,
      )

      if (!data) {
        return jsonOnboardingPathOptionsNotFound()
      }

      return jsonSuccess(data)
    } catch (error) {
      return jsonInternalErrorFromError(error, "加载路径选项失败")
    }
  }
}
