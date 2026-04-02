import "server-only"

import { jsonInternalErrorFromError } from "@/server/lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "@/server/lib/route-response.ts"
import {
  parsePlanDraftIdParam,
  parsePlanDraftRegenerateBody,
  parsePlanFromMaterialBody,
} from "@/server/lib/request-validation.ts"
import { MaterialPlanError } from "@/server/modules/learning-materials/errors.ts"

import type { ConfirmDraftResult } from "./activation.ts"
import { LearningPlanServiceError } from "./errors.ts"
import {
  confirmPlanDraftForUser,
  createPlanFromMaterial,
  regeneratePlanDraft,
  type PlanFromMaterialInput,
  type PlanFromMaterialResult,
  type PlanDraftRegenerateInput,
} from "./service.ts"

type RequestLike = {
  json: () => Promise<unknown>
}

async function readJsonObjectOr422(request: RequestLike) {
  try {
    return { ok: true as const, data: await request.json() }
  } catch {
    return {
      ok: false as const,
      response: jsonError("VALIDATION_FAILED", "请求体不是合法 JSON。", 422),
    }
  }
}

type DraftRouteContext = {
  params: Promise<{
    id: string
  }>
}

export function createPlanFromMaterialPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  createPlanFromMaterial?: (
    userId: string,
    input: PlanFromMaterialInput,
  ) => Promise<PlanFromMaterialResult>
}) {
  const runCreate =
    dependencies.createPlanFromMaterial ?? createPlanFromMaterial

  return async function POST(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const rawBody = await readJsonObjectOr422(request)
      if (!rawBody.ok) {
        return rawBody.response
      }

      const parsed = parsePlanFromMaterialBody(rawBody.data)

      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const result = await runCreate(auth.userId, {
        links: parsed.data.links,
        userGoal: parsed.data.userGoal,
        weeklyHours: parsed.data.weeklyHours,
      })

      return jsonSuccess(result)
    } catch (error) {
      const mapped = mapLearningPlanRouteError(error)
      if (mapped) {
        return mapped
      }

      return jsonInternalErrorFromError(error, "生成学习计划草稿失败。")
    }
  }
}

export function createPlanDraftConfirmPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  confirmPlanDraftForUser?: (
    userId: string,
    draftId: string,
  ) => Promise<ConfirmDraftResult>
}) {
  const runConfirm = dependencies.confirmPlanDraftForUser ?? confirmPlanDraftForUser

  return async function POST(
    request: RequestLike,
    context: DraftRouteContext,
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const idParsed = parsePlanDraftIdParam(params.id)

      if (!idParsed.ok) {
        return jsonError(idParsed.code, idParsed.message, 400)
      }

      const result = await runConfirm(auth.userId, idParsed.data)
      return jsonSuccess(result)
    } catch (error) {
      const mapped = mapLearningPlanRouteError(error)
      if (mapped) {
        return mapped
      }

      return jsonInternalErrorFromError(error, "确认学习计划草稿失败。")
    }
  }
}

export function createPlanDraftRegeneratePostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  regeneratePlanDraft?: (
    userId: string,
    draftId: string,
    input: PlanDraftRegenerateInput,
  ) => Promise<PlanFromMaterialResult>
}) {
  const runRegenerate = dependencies.regeneratePlanDraft ?? regeneratePlanDraft

  return async function POST(
    request: RequestLike,
    context: DraftRouteContext,
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const idParsed = parsePlanDraftIdParam(params.id)

      if (!idParsed.ok) {
        return jsonError(idParsed.code, idParsed.message, 400)
      }

      const rawBody = await readJsonObjectOr422(request)
      if (!rawBody.ok) {
        return rawBody.response
      }

      const bodyParsed = parsePlanDraftRegenerateBody(rawBody.data)

      if (!bodyParsed.ok) {
        return jsonError(bodyParsed.code, bodyParsed.message, 400)
      }

      const result = await runRegenerate(auth.userId, idParsed.data, {
        links: bodyParsed.data.links,
        userGoal: bodyParsed.data.userGoal,
        weeklyHours: bodyParsed.data.weeklyHours,
      })

      return jsonSuccess(result)
    } catch (error) {
      const mapped = mapLearningPlanRouteError(error)
      if (mapped) {
        return mapped
      }

      return jsonInternalErrorFromError(error, "重新生成学习计划草稿失败。")
    }
  }
}

function mapLearningPlanRouteError(error: unknown) {
  if (error instanceof LearningPlanServiceError) {
    return jsonError(error.code, error.message, error.httpStatus)
  }

  if (error instanceof MaterialPlanError) {
    return jsonError(error.code, error.message, error.httpStatus)
  }

  return null
}
