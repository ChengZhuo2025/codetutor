import "server-only"

import { z } from "zod"

export const plannerTaskSchema = z.object({
  taskNo: z.number().int().min(1).max(20),
  title: z.string().min(1).max(256),
  objective: z.string().min(1).max(8000),
  practiceSteps: z.array(z.string().min(1)).min(2).max(20),
  acceptanceCriteria: z.string().min(1).max(4000),
  estimatedMinutes: z.number().int().min(15).max(240).optional(),
  sourceRefs: z.array(z.string()).min(1).max(20),
  goalAlignmentRefs: z.array(z.string()).default([]),
})

export const plannerOutputSchema = z.object({
  title: z.string().min(1).max(256),
  goal: z.string().min(1).max(8000),
  alignmentTable: z.array(z.record(z.string(), z.unknown())).default([]),
  estimatedTotalMinutes: z.number().int().min(30).max(2400).optional(),
  week1TaskNos: z.array(z.number().int().min(1).max(20)).default([]),
  warnings: z.array(z.string()).default([]),
  tasks: z.array(plannerTaskSchema).min(3).max(8),
})

export type PlannerOutput = z.infer<typeof plannerOutputSchema>

export function validatePlannerBusinessRules(data: PlannerOutput) {
  const nos = data.tasks.map((t) => t.taskNo).sort((a, b) => a - b)
  for (let i = 0; i < nos.length; i += 1) {
    if (nos[i] !== i + 1) {
      return "tasks 的 taskNo 必须从 1 连续递增。"
    }
  }
  const titles = new Set(data.tasks.map((t) => t.title.trim().toLowerCase()))
  if (titles.size !== data.tasks.length) {
    return "tasks 标题不能重复。"
  }
  for (const no of data.week1TaskNos) {
    if (!nos.includes(no)) {
      return "week1TaskNos 必须引用已有 taskNo。"
    }
  }
  return null
}
