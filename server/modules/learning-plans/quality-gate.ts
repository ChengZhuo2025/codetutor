import "server-only"

import type { PlannerOutput } from "./schema.ts"

export type QualityGateResult = {
  plan: PlannerOutput
  qualityStatus: "passed" | "pilot_fallback"
  qualityReport: {
    status: "passed" | "pilot_fallback"
    checks: Array<{ code: string; passed: boolean; message: string }>
    warnings: string[]
  }
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

export function runPlanQualityGate(plan: PlannerOutput): QualityGateResult {
  const checks = [
    {
      code: "TASK_COUNT_RANGE",
      passed: plan.tasks.length >= 3 && plan.tasks.length <= 8,
      message: "任务数需在 3 到 8 之间。",
    },
    {
      code: "ACCEPTANCE_CRITERIA_PRESENT",
      passed: plan.tasks.every((task) => task.acceptanceCriteria.trim().length > 0),
      message: "每个任务都必须包含验收标准。",
    },
    {
      code: "SOURCE_REFS_PRESENT",
      passed: plan.tasks.every((task) => task.sourceRefs.length > 0),
      message: "每个任务都必须引用至少一个 sourceRef。",
    },
  ]

  if (checks.every((check) => check.passed)) {
    return {
      plan,
      qualityStatus: "passed",
      qualityReport: {
        status: "passed",
        checks,
        warnings: plan.warnings ?? [],
      },
    }
  }

  return {
    plan: buildPilotPlan(plan),
    qualityStatus: "pilot_fallback",
    qualityReport: {
      status: "pilot_fallback",
      checks,
      warnings: plan.warnings ?? [],
    },
  }
}
