import "server-only"

import type { MaterialChunk } from "@/server/modules/learning-materials/normalizer.ts"

export function buildPlannerUserMessage(input: {
  chunks: MaterialChunk[]
  userGoal?: string | null
  targetToolName?: string | null
  learningLevelLabel?: string | null
  weeklyHours?: number | null
}) {
  const parts: string[] = []

  parts.push("## 用户与偏好")
  parts.push(`- 主工具：${input.targetToolName ?? "未指定"}`)
  parts.push(`- 学习等级：${input.learningLevelLabel ?? "未指定"}`)
  parts.push(`- 每周可投入（小时）：${input.weeklyHours ?? "未指定"}`)
  parts.push(`- 学习目标补充：${input.userGoal?.trim() || "无"}`)

  parts.push("\n## 材料分块（每块有 id，sourceRefs 必须引用这些 id）")
  for (const chunk of input.chunks) {
    parts.push(`\n### ${chunk.id}\nURL: ${chunk.url}\n${chunk.excerpt}`)
  }

  parts.push("\n请输出 JSON，契约见系统提示。")

  return parts.join("\n")
}
