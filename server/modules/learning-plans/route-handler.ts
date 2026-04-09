import "server-only"

import type { NextRequest } from "next/server"
import { jsonInternalErrorFromError } from "@/server/lib/route-error.ts"
import {
  jsonAuthRequired,
  jsonError,
  jsonSuccess,
} from "@/server/lib/route-response.ts"
import {
  parseMaterialIntakeIdParam,
  parsePlanDraftPatchBody,
  parsePlanDraftIdParam,
  parsePlanDraftRegenerateBody,
  parsePlanDraftTaskIdParam,
  parsePlanFromMaterialBody,
} from "@/server/lib/request-validation.ts"
import { MaterialPlanError } from "@/server/modules/learning-materials/errors.ts"
import {
  getMaterialIntakeStatus,
  type MaterialIntakeStatusResult,
} from "@/server/modules/learning-materials/status.ts"

import type { ConfirmDraftResult } from "./activation.ts"
import { LearningPlanServiceError } from "./errors.ts"
import {
  confirmPlanDraftForUser,
  createPlanFromMaterial,
  getPlanDraftDetailForUser,
  regeneratePlanDraft,
  regeneratePlanDraftTaskForUser,
  updatePlanDraftForUser,
  type PlanDraftDetailResult,
  type PlanFromMaterialInput,
  type PlanFromMaterialResult,
  type PlanDraftPatchInput,
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

type DraftTaskRouteContext = {
  params: Promise<{
    id: string
    taskId: string
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
        return jsonError(
          parsed.code,
          parsed.message,
          parsed.code.startsWith("MATERIAL_") ? 422 : 400,
        )
      }

      const result = await runCreate(auth.userId, {
        links: parsed.data.links,
        userGoal: parsed.data.userGoal,
        weeklyHours: parsed.data.weeklyHours,
        currentConstraints: parsed.data.currentConstraints,
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

export function createMaterialIntakeStatusGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getMaterialIntakeStatus?: (
    userId: string,
    intakeId: string,
  ) => Promise<MaterialIntakeStatusResult>
}) {
  const loadStatus = dependencies.getMaterialIntakeStatus ?? getMaterialIntakeStatus

  return async function GET(
    request: unknown,
    context: DraftRouteContext,
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const idParsed = parseMaterialIntakeIdParam(params.id)

      if (!idParsed.ok) {
        return jsonError(idParsed.code, idParsed.message, 400)
      }

      const result = await loadStatus(auth.userId, idParsed.data)
      return jsonSuccess(result)
    } catch (error) {
      const mapped = mapLearningPlanRouteError(error)
      if (mapped) {
        return mapped
      }

      return jsonInternalErrorFromError(error, "读取材料摄取状态失败。")
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

export function createPlanDraftDetailHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getPlanDraftDetailForUser?: (
    userId: string,
    draftId: string,
  ) => Promise<PlanDraftDetailResult>
  updatePlanDraftForUser?: (
    userId: string,
    draftId: string,
    input: PlanDraftPatchInput,
  ) => Promise<PlanDraftDetailResult>
}) {
  const loadDetail = dependencies.getPlanDraftDetailForUser ?? getPlanDraftDetailForUser
  const patchDetail = dependencies.updatePlanDraftForUser ?? updatePlanDraftForUser

  return {
    GET: async (request: unknown, context: DraftRouteContext) => {
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

        const result = await loadDetail(auth.userId, idParsed.data)
        return jsonSuccess(result)
      } catch (error) {
        const mapped = mapLearningPlanRouteError(error)
        if (mapped) {
          return mapped
        }
        return jsonInternalErrorFromError(error, "读取学习计划草稿失败。")
      }
    },
    PATCH: async (request: RequestLike, context: DraftRouteContext) => {
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

        const bodyParsed = parsePlanDraftPatchBody(rawBody.data)
        if (!bodyParsed.ok) {
          return jsonError(bodyParsed.code, bodyParsed.message, 400)
        }

        const result = await patchDetail(auth.userId, idParsed.data, bodyParsed.data)
        return jsonSuccess(result)
      } catch (error) {
        const mapped = mapLearningPlanRouteError(error)
        if (mapped) {
          return mapped
        }
        return jsonInternalErrorFromError(error, "更新学习计划草稿失败。")
      }
    },
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

export function createPlanDraftTaskRegeneratePostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  regeneratePlanDraftTaskForUser?: (
    userId: string,
    draftId: string,
    taskId: string,
  ) => Promise<PlanDraftDetailResult>
}) {
  const runRegenerateTask =
    dependencies.regeneratePlanDraftTaskForUser ?? regeneratePlanDraftTaskForUser

  return async function POST(
    request: NextRequest,
    context: DraftTaskRouteContext,
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)
      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const draftIdParsed = parsePlanDraftIdParam(params.id)
      if (!draftIdParsed.ok) {
        return jsonError(draftIdParsed.code, draftIdParsed.message, 400)
      }

      const taskIdParsed = parsePlanDraftTaskIdParam(params.taskId)
      if (!taskIdParsed.ok) {
        return jsonError(taskIdParsed.code, taskIdParsed.message, 400)
      }

      const result = await runRegenerateTask(
        auth.userId,
        draftIdParsed.data,
        taskIdParsed.data,
      )

      return jsonSuccess(result)
    } catch (error) {
      const mapped = mapLearningPlanRouteError(error)
      if (mapped) {
        return mapped
      }
      return jsonInternalErrorFromError(error, "重生成学习计划草稿任务失败。")
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
