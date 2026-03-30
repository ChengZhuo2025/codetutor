export const LEARNING_LEVEL_DEFINITIONS = [
  {
    code: "beginner",
    summaryLabel: "完全入门",
    shortLabel: "零基础",
    cardLabel: "零基础 / 刚入门",
    description: "几乎没写过代码，或刚开始接触编程与 AI 工具",
  },
  {
    code: "intermediate",
    summaryLabel: "有一定基础",
    shortLabel: "有基础",
    cardLabel: "写过一些代码",
    description: "懂基本语法和项目结构，主要想把 AI 用得更顺手",
  },
  {
    code: "advanced",
    summaryLabel: "进阶提升",
    shortLabel: "进阶",
    cardLabel: "有项目经验",
    description: "做过完整项目，想系统梳理 AI 协作与交付方法",
  },
] as const

export const SELECTION_MODE_DEFINITIONS = [
  {
    code: "self_directed",
    summaryLabel: "自由模式",
    shortLabel: "自由模式",
  },
  {
    code: "preset_training",
    summaryLabel: "平台训练模式",
    shortLabel: "闯关模式",
  },
] as const

export type LearningLevelCode = (typeof LEARNING_LEVEL_DEFINITIONS)[number]["code"]
export type SelectionModeCode = (typeof SELECTION_MODE_DEFINITIONS)[number]["code"]

export const VALID_LEARNING_LEVELS = new Set<string>(
  LEARNING_LEVEL_DEFINITIONS.map((item) => item.code),
)

export const VALID_SELECTION_MODES = new Set<string>(
  SELECTION_MODE_DEFINITIONS.map((item) => item.code),
)

export function getLearningLevelLabel(
  code: string,
  variant: "summary" | "short" | "card" = "summary",
) {
  const definition = LEARNING_LEVEL_DEFINITIONS.find((item) => item.code === code)

  if (!definition) {
    return code
  }

  if (variant === "short") {
    return definition.shortLabel
  }

  if (variant === "card") {
    return definition.cardLabel
  }

  return definition.summaryLabel
}

export function getLearningLevelDescription(code: string) {
  return LEARNING_LEVEL_DEFINITIONS.find((item) => item.code === code)?.description ?? ""
}

export function getSelectionModeLabel(
  code: string,
  variant: "summary" | "short" = "summary",
) {
  const definition = SELECTION_MODE_DEFINITIONS.find((item) => item.code === code)

  if (!definition) {
    return code
  }

  return variant === "short" ? definition.shortLabel : definition.summaryLabel
}
