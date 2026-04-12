import "server-only"

import type { MaterialChunk } from "@/server/modules/learning-materials/normalizer.ts"
import type { PlannerSourceStructure } from "./source-structure.ts"

export function buildPlannerUserMessage(input: {
  chunks: MaterialChunk[]
  userGoal?: string | null
  targetToolName?: string | null
  learningLevelLabel?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
  sourceStructure?: PlannerSourceStructure | null
  retryFeedback?: string | null
}) {
  const parts: string[] = []

  parts.push("## 用户与偏好")
  parts.push(`- 主工具：${input.targetToolName ?? "未指定"}`)
  parts.push(`- 学习等级：${input.learningLevelLabel ?? "未指定"}`)
  parts.push(`- 每周可投入（小时）：${input.weeklyHours ?? "未指定"}`)
  parts.push(`- 学习目标补充：${input.userGoal?.trim() || "无"}`)
  parts.push(`- 当前约束：${input.currentConstraints?.trim() || "无"}`)

  parts.push("\n## 材料分块（每块有 id，sourceRefs 必须引用这些 id）")
  for (const chunk of input.chunks) {
    parts.push(
      `\n### ${chunk.id}\nURL: ${chunk.url}\nmodality: ${chunk.modality}\nevidenceType: ${chunk.evidenceType}\nconfidence: ${chunk.confidence}\nsourceRef: ${JSON.stringify(chunk.sourceRef)}\n${chunk.excerpt}`,
    )
  }

  parts.push("\n要求：")
  parts.push("- 高置信度证据优先；弱证据只能作为补充，不要据此编造细节。")
  parts.push("- 每个任务都必须包含 masteryPoints（本关要掌握，2-6 条）和 cautions（注意事项，1-6 条）。")
  parts.push("- cautions 中真正的高频误区请标记 isTrap=true。")
  if (input.sourceStructure?.numberedItemCount && input.sourceStructure.minimumTaskCount) {
    parts.push(
      `- 材料中检测到约 ${input.sourceStructure.numberedItemCount} 个编号知识点/技巧，计划至少拆成 ${input.sourceStructure.minimumTaskCount} 关；单关最多覆盖 3 个编号项，不要把 4 个及以上编号项压成一关。`,
    )
    if (input.sourceStructure.numberedItemsPreview.length > 0) {
      parts.push(`- 检测到的编号项示例：${input.sourceStructure.numberedItemsPreview.join("；")}`)
    }
  }
  if (input.retryFeedback?.trim()) {
    parts.push(`- 上一次计划被退回原因：${input.retryFeedback.trim()}`)
    parts.push("- 请根据退回原因重排关卡粒度，优先修正关卡拆分过粗的问题。")
  }
  parts.push("- 请输出 JSON，契约见系统提示。")

  return parts.join("\n")
}
