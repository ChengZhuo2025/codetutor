import "server-only"

import { extractJsonObjectString } from "./json-parse.ts"
import type { PlannerOutput } from "./schema.ts"
import type { PlannerSourceStructure } from "./source-structure.ts"
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
  sourceStructure?: PlannerSourceStructure | null
  attempt?: number
  maxAttempts?: number
}

type QualityGateDependencies = {
  invokeQualityModel?: typeof invokeMaterialPipelineModel
}

const GENERIC_OBJECTIVE_PATTERN = /(了解一下|熟悉概念|继续阅读资料|看看内容|知道大概)/i
const GENERIC_LESSON_BRIEF_PATTERN = /(了解一下|熟悉概念|继续练习|按感觉|大概|相关内容|自行尝试|看一看)/i
const ABSTRACT_PRACTICE_STEP_PATTERN = /(尝试优化|验证效果|继续练习|了解一下|熟悉概念|看看内容|自行尝试|按感觉)/i
const EVIDENCE_KEYWORDS = [
  "截图",
  "代码",
  "终端",
  "输出",
  "页面",
  "prompt",
  "Prompt",
  "报错",
  "日志",
  "文件",
  "链接",
  "录屏",
  "文字",
  "说明",
  "复盘",
]
const QUALITY_SKIP_REASON = "规则检查已覆盖当前低风险计划，跳过模型自检。"

function hasEvidenceKeyword(text: string) {
  return EVIDENCE_KEYWORDS.some((keyword) => text.includes(keyword))
}

function extractEvidenceKeywords(text: string) {
  return EVIDENCE_KEYWORDS.filter((keyword) => text.includes(keyword))
}

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
  const numberedTaskPacingMessage =
    input.sourceStructure?.minimumTaskCount && input.sourceStructure.numberedItemCount
      ? `材料中识别到约 ${input.sourceStructure.numberedItemCount} 个编号项，计划至少拆成 ${input.sourceStructure.minimumTaskCount} 关。`
      : "编号型教程需要按材料节奏拆成足够细的学习任务。"

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
      code: "MASTERY_POINTS_PRESENT",
      passed: input.plan.tasks.every((task) => task.masteryPoints.length >= 2),
      message: "每个任务都必须给出至少 2 条当前任务要掌握。",
    },
    {
      code: "CAUTIONS_PRESENT",
      passed: input.plan.tasks.every((task) => (
        task.cautions.length >= 1
        && task.cautions.every((caution) => caution.text.trim().length > 0)
      )),
      message: "每个任务都必须给出至少 1 条注意事项。",
    },
    {
      code: "OBJECTIVE_NOT_GENERIC",
      passed: input.plan.tasks.every((task) => (
        task.objective.trim().length >= 12 && !GENERIC_OBJECTIVE_PATTERN.test(task.objective)
      )),
      message: "任务 objective 不能过于空泛。",
    },
    {
      code: "LESSON_BRIEF_NOT_GENERIC",
      passed: input.plan.tasks.every((task) => (
        task.lessonBrief.trim().length >= 30
        && !GENERIC_LESSON_BRIEF_PATTERN.test(task.lessonBrief)
        && task.lessonBrief !== task.objective
      )),
      message: "每关 lessonBrief 必须是具体的新手教案，不能只写泛化学习建议。",
    },
    {
      code: "PRACTICE_STEPS_ACTIONABLE",
      passed: input.plan.tasks.every((task) => (
        task.practiceSteps.length >= 2
        && task.practiceSteps.every((step) => (
          step.trim().length >= 4
          && !ABSTRACT_PRACTICE_STEP_PATTERN.test(step.trim())
        ))
      )),
      message: "practiceSteps 必须是可照做的具体操作，不能只写抽象动作。",
    },
    {
      code: "CHECKPOINTS_MATCH_SUBMISSION_EVIDENCE",
      passed: input.plan.tasks.every((task) => {
        const submissionKeywords = extractEvidenceKeywords(task.submissionGuide)
        return (
          submissionKeywords.length > 0
          && task.checkpoints.length >= 2
          && task.checkpoints.some((checkpoint) => (
            hasEvidenceKeyword(checkpoint)
            || submissionKeywords.some((keyword) => checkpoint.includes(keyword))
          ))
        )
      }),
      message: "checkpoints 必须和 submissionGuide 中要求提交的证据类型对齐。",
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
    {
      code: "NUMBERED_TUTORIAL_TASK_PACING",
      passed:
        input.evidenceCoverage?.isWeakEvidence
        || !input.sourceStructure?.minimumTaskCount
        || input.plan.tasks.length >= input.sourceStructure.minimumTaskCount,
      message: numberedTaskPacingMessage,
    },
  ]
}

function collectQualityRiskSignals(input: RunPlanQualityGateInput) {
  const totalMinutes = input.plan.tasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  )
  const signals: string[] = []

  if (input.evidenceCoverage?.isWeakEvidence) {
    signals.push("weak_evidence")
  } else if (input.evidenceCoverage && !input.evidenceCoverage.isSufficient) {
    signals.push("insufficient_evidence")
  }

  if (input.plan.tasks.length >= 5) {
    signals.push("long_plan")
  }

  if (input.plan.tasks.some((task) => !task.estimatedMinutes)) {
    signals.push("missing_estimates")
  }

  if (input.weeklyHours && totalMinutes > input.weeklyHours * 60 * 1.8) {
    signals.push("schedule_pressure")
  }

  return signals
}

function buildQualitySelfCheckPayload(
  input: RunPlanQualityGateInput,
  riskSignals: string[],
) {
  const totalMinutes = input.plan.tasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  )

  return {
    warnings: input.intakeWarnings ?? [],
    evidenceCoverage: input.evidenceCoverage ?? null,
    riskSignals,
    planSummary: {
      title: input.plan.title,
      goal: input.plan.goal,
      taskCount: input.plan.tasks.length,
      totalMinutes,
      week1TaskNos: input.plan.week1TaskNos,
      warningCount: input.plan.warnings?.length ?? 0,
      tasks: input.plan.tasks.map((task) => ({
        taskNo: task.taskNo,
        title: task.title,
        objective: task.objective,
        acceptanceCriteria: task.acceptanceCriteria,
        estimatedMinutes: task.estimatedMinutes ?? null,
        practiceStepCount: task.practiceSteps.length,
        masteryPointCount: task.masteryPoints.length,
        cautionCount: task.cautions.length,
        sourceRefCount: task.sourceRefs.length,
      })),
    },
  }
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

  const riskSignals = collectQualityRiskSignals(input)
  if (riskSignals.length === 0) {
    return {
      enabled: false,
      decision: "skipped",
      reason: QUALITY_SKIP_REASON,
    }
  }

  try {
    const response = await (dependencies.invokeQualityModel ?? invokeMaterialPipelineModel)({
      runtime: input.qualityRuntime,
      systemPrompt: "你是学习计划质量闸门。只输出 JSON：{\"decision\":\"pass|retry|fallback\",\"reason\":\"...\"}。",
      userPrompt: JSON.stringify(buildQualitySelfCheckPayload(input, riskSignals)),
      temperature: 0,
      maxOutputTokens: 160,
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
    const failedChecks = checks.filter((check) => !check.passed)
    const numberedTaskPacingFailed =
      failedChecks.length === 1
      && failedChecks[0]?.code === "NUMBERED_TUTORIAL_TASK_PACING"
      && input.sourceStructure?.minimumTaskCount
      && input.sourceStructure.numberedItemCount
      && !input.evidenceCoverage?.isWeakEvidence

    if (numberedTaskPacingFailed) {
      const sourceStructure = input.sourceStructure
      if (!sourceStructure?.minimumTaskCount || !sourceStructure.numberedItemCount) {
        throw new Error("numbered tutorial pacing check requires source structure")
      }

      const retryWarning =
        `材料中有约 ${sourceStructure.numberedItemCount} 个编号项，当前计划只有 ${input.plan.tasks.length} 关，至少拆成 ${sourceStructure.minimumTaskCount} 关。`

      if (attempt < maxAttempts) {
        return {
          plan: input.plan,
          qualityStatus: "passed",
          decision: "retry",
          qualityReport: {
            status: "passed",
            checks,
            warnings: [...warnings, retryWarning],
            selfCheck: {
              enabled: false,
              decision: "retry",
              reason: "编号型教程任务粒度过粗，退回重生成。",
            },
            fallbackReason: "numbered_outline_task_count_underflow",
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
          warnings: [...warnings, `${retryWarning} 已达到最后一次生成机会，请人工复核。`],
          selfCheck: {
            enabled: false,
            decision: "skipped",
            reason: "编号型教程任务粒度仍偏粗，但已耗尽自动重试次数。",
          },
          fallbackReason: "numbered_outline_retry_exhausted",
        },
      }
    }

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
      warnings,
      selfCheck,
      fallbackReason: null,
    },
  }
}
