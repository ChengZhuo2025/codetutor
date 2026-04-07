import type { LearningTip } from "@/features/learning/types"

export type LearningTipRenderContext = {
  currentStepTitle: string
  currentStepGoal: string
  currentStepFocus: string | null
  nextStepTitle: string | null
  keyPoint: string
  primaryPitfall: string | null
}

type LearningTipTemplate = {
  title: (context: LearningTipRenderContext) => string
  body: (context: LearningTipRenderContext) => string
}

const LEARNING_TIP_TEMPLATES: LearningTipTemplate[] = [
  {
    title: (context) => `先验证「${context.currentStepTitle}」最小结果`,
    body: (context) =>
      `本关先围绕「${context.currentStepGoal}」做一次最小可验证尝试，确认核心动作能跑通后再扩展。`,
  },
  {
    title: (context) => `优先对齐「${context.keyPoint}」这一个判断标准`,
    body: (context) =>
      context.currentStepFocus ??
      "先用一句结果导向的话描述你要达成什么，再补充代码或截图，反馈会更准确。",
  },
  {
    title: (context) =>
      context.primaryPitfall ? "卡住时先排这个高频卡点" : "给自己一个清晰的下一步",
    body: (context) => {
      if (context.primaryPitfall) {
        return `先检查：${context.primaryPitfall}。修正后把最新结果贴回，再决定是否进入下一步。`
      }

      if (context.nextStepTitle) {
        return `完成这一步后就进入「${context.nextStepTitle}」，先把当前关卡做完，不要并行处理多个问题。`
      }

      return "当前路径接近完成，先提交本关结果，再回到地图确认下一条学习路径。"
    },
  },
]

export function renderLearningTips(context: LearningTipRenderContext): LearningTip[] {
  return LEARNING_TIP_TEMPLATES.map((template) => ({
    title: template.title(context),
    body: template.body(context),
  }))
}
