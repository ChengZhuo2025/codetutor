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
  parts.push("- 你不是简单摘录教程，而是把教程内容重写成适合新手照做的步骤化教案。")
  parts.push("- 每个任务都必须包含 lessonBrief（先理解方法，解释为什么这么做、适用场景和操作前提）、practiceSteps（跟着做，2-20 条具体可执行步骤）、submissionGuide（做完后应提交什么证据）、checkpoints（AI 验收要看的 2-8 个证据点）、masteryPoints（当前任务要掌握，2-6 条）和 cautions（注意事项，1-6 条）。")
  parts.push("- practiceSteps 不能写成“尝试优化”“验证效果”这类抽象动作；必须能让新手照着完成，例如打开哪个界面、输入什么、运行什么、观察什么。")
  parts.push("- submissionGuide 必须明确要求用户提交截图、代码片段、终端输出、页面效果、Prompt、报错信息或文字描述中的一种或多种。")
  parts.push("- checkpoints 必须和 submissionGuide、acceptanceCriteria 对齐，用于判断用户反馈是否真的达成当前任务。")
  parts.push("- cautions 中真正的高频误区请标记 isTrap=true。")
  if (input.sourceStructure?.numberedItemCount && input.sourceStructure.minimumTaskCount) {
    parts.push(
      `- 材料中检测到约 ${input.sourceStructure.numberedItemCount} 个编号知识点/技巧，计划至少拆成 ${input.sourceStructure.minimumTaskCount} 个学习任务；单个任务最多覆盖 3 个编号项，不要把 4 个及以上编号项压成一个任务。`,
    )
    if (input.sourceStructure.numberedItemsPreview.length > 0) {
      parts.push(`- 检测到的编号项示例：${input.sourceStructure.numberedItemsPreview.join("；")}`)
    }
  }
  if (input.retryFeedback?.trim()) {
    parts.push(`- 上一次计划被退回原因：${input.retryFeedback.trim()}`)
    parts.push("- 请根据退回原因重排任务粒度，优先修正任务拆分过粗的问题。")
  }
  parts.push("- 请输出 JSON，契约见系统提示。")

  return parts.join("\n")
}
