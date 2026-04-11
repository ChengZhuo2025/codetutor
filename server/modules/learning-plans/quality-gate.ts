import "server-only"

import { extractJsonObjectString } from "./json-parse.ts"
import type { PlannerOutput } from "./schema.ts"
import {
  invokeMaterialPipelineModel,
  type MaterialPipelineRuntime,
} from "../learning-materials/providers.ts"
import type { MaterialEvidenceCoverage } from "../learning-materials/normalizer.ts"

type QualityCheck = {
  code: string
  passed: boolean
  message: string
}

type QualitySelfCheck = {
  enabled: boolean
  decision: "pass" | "retry" | "fallback" | "skipped"
  reason: string | null
}

export type QualityGateResult = {
  plan: PlannerOutput
  qualityStatus: "passed" | "pilot_fallback"
  qualityReport: {
    status: "passed" | "pilot_fallback"
    checks: QualityCheck[]
    warnings: string[]
    selfCheck: QualitySelfCheck
    fallbackReason: string | null
  }
  decision: "pass" | "retry" | "fallback"
}

type RunPlanQualityGateInput = {
  plan: PlannerOutput
  weeklyHours?: number | null
  intakeWarnings?: string[]
  evidenceCoverage?: MaterialEvidenceCoverage | null
  qualityRuntime?: MaterialPipelineRuntime | null
  attempt?: number
  maxAttempts?: number
}

type QualityGateDependencies = {
  invokeQualityModel?: typeof invokeMaterialPipelineModel
}

const GENERIC_OBJECTIVE_PATTERN = /(了解一下|熟悉概念|继续阅读资料|看看内容|知道大概)/i

function buildPilotPlan(plan: PlannerOutput): PlannerOutput {
  const tasks = plan.tasks.slice(0, 3).map((task, index) => ({
    ...task,
    taskNo: index + 1,
  }))

  return {
    ...plan,
    title: `${plan.title}（3 关试点版）`,
    week1TaskNos: tasks.map((task) => task.taskNo),
    tasks,
    warnings: [...(plan.warnings ?? []), "原始计划质量不足，已自动降级为 3 关试点计划。"],
  }
}

function buildRuleChecks(input: RunPlanQualityGateInput): QualityCheck[] {
  const totalMinutes = input.plan.tasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  )

  return [
    {
      code: "TASK_COUNT_RANGE",
      passed: input.plan.tasks.length >= 3 && input.plan.tasks.length <= 8,
      message: "任务数需在 3 到 8 之间。",
    },
    {
      code: "ACCEPTANCE_CRITERIA_PRESENT",
      passed: input.plan.tasks.every((task) => task.acceptanceCriteria.trim().length > 0),
      message: "每个任务都必须包含验收标准。",
    },
    {
      code: "SOURCE_REFS_PRESENT",
      passed: input.plan.tasks.every((task) => task.sourceRefs.length > 0),
      message: "每个任务都必须引用至少一个 sourceRef。",
    },
    {
      code: "OBJECTIVE_NOT_GENERIC",
      passed: input.plan.tasks.every((task) => (
        task.objective.trim().length >= 12 && !GENERIC_OBJECTIVE_PATTERN.test(task.objective)
      )),
      message: "任务 objective 不能过于空泛。",
    },
    {
      code: "WEEKLY_HOURS_BALANCED",
      passed:
        !input.weeklyHours
        || totalMinutes <= input.weeklyHours * 60 * 2.5,
      message: "计划总时长不能与每周可投入时长明显失衡。",
    },
    {
      code: "WEAK_EVIDENCE_GUARD",
      passed: !(
        input.evidenceCoverage?.isWeakEvidence
        && input.plan.tasks.length > 5
      ),
      message: "弱证据来源不能直接输出过长计划。",
    },
  ]
}

async function runQualitySelfCheck(
  input: RunPlanQualityGateInput,
  dependencies: QualityGateDependencies,
): Promise<QualitySelfCheck> {
  if (!input.qualityRuntime) {
    return {
      enabled: false,
      decision: "skipped",
      reason: "未配置 quality-check 模型，已跳过自检。",
    }
  }

  try {
    const response = await (dependencies.invokeQualityModel ?? invokeMaterialPipelineModel)({
      runtime: input.qualityRuntime,
      systemPrompt: "你是学习计划质量闸门。只输出 JSON：{\"decision\":\"pass|retry|fallback\",\"reason\":\"...\"}。",
      userPrompt: JSON.stringify({
        warnings: input.intakeWarnings ?? [],
        evidenceCoverage: input.evidenceCoverage ?? null,
        plan: input.plan,
      }),
      temperature: 0,
      maxOutputTokens: 400,
    })

    const raw = JSON.parse(extractJsonObjectString(response.content)) as {
      decision?: "pass" | "retry" | "fallback"
      reason?: string
    }

    return {
      enabled: true,
      decision: raw.decision ?? "fallback",
      reason: raw.reason?.trim() ?? null,
    }
  } catch (error) {
    return {
      enabled: false,
      decision: "skipped",
      reason: error instanceof Error ? error.message : "quality-check 自检失败，已跳过。",
    }
  }
}

export async function runPlanQualityGate(
  input: RunPlanQualityGateInput,
  dependencies: QualityGateDependencies = {},
): Promise<QualityGateResult> {
  const checks = buildRuleChecks(input)
  const warnings = [...new Set([...(input.plan.warnings ?? []), ...(input.intakeWarnings ?? [])])]
  const attempt = input.attempt ?? 1
  const maxAttempts = input.maxAttempts ?? 2

  if (!checks.every((check) => check.passed)) {
    const fallbackPlan = buildPilotPlan(input.plan)
    return {
      plan: fallbackPlan,
      qualityStatus: "pilot_fallback",
      decision: "fallback",
      qualityReport: {
        status: "pilot_fallback",
        checks,
        warnings: [...warnings, "规则质量闸门未通过，已降级为 3 关试点计划。"],
        selfCheck: {
          enabled: false,
          decision: "skipped",
          reason: "规则检查已触发 fallback，未继续执行模型自检。",
        },
        fallbackReason: "rule_checks_failed",
      },
    }
  }

  const selfCheck = await runQualitySelfCheck(input, dependencies)
  if (selfCheck.decision === "retry" && attempt < maxAttempts) {
    return {
      plan: input.plan,
      qualityStatus: "passed",
      decision: "retry",
      qualityReport: {
        status: "passed",
        checks,
        warnings,
        selfCheck,
        fallbackReason: null,
      },
    }
  }

  if (selfCheck.decision === "fallback" || (selfCheck.decision === "retry" && attempt >= maxAttempts)) {
    const fallbackPlan = buildPilotPlan(input.plan)
    const fallbackReason = selfCheck.decision === "fallback"
      ? "quality_model_requested_fallback"
      : "quality_model_retry_exhausted"

    return {
      plan: fallbackPlan,
      qualityStatus: "pilot_fallback",
      decision: "fallback",
      qualityReport: {
        status: "pilot_fallback",
        checks,
        warnings: [...warnings, "质量闸门建议收缩计划，已降级为 3 关试点计划。"],
        selfCheck,
        fallbackReason,
      },
    }
  }

  return {
    plan: input.plan,
    qualityStatus: "passed",
    decision: "pass",
    qualityReport: {
      status: "passed",
      checks,
      warnings: selfCheck.reason && selfCheck.decision === "skipped"
        ? [...warnings, selfCheck.reason]
        : warnings,
      selfCheck,
      fallbackReason: null,
    },
  }
}
