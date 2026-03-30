export type LearningInteractionType =
  | "teaching"
  | "blocked_help"
  | "task_review"
  | "completion_feedback"
  | "path_guidance"

type OutputSectionSpec = {
  title: string
  instruction: string
}

type OutputFormatTemplate = {
  summaryInstruction: string
  sections: OutputSectionSpec[]
  requiredActionExample: string
}

const OUTPUT_FORMAT_TEMPLATES: Record<LearningInteractionType, OutputFormatTemplate> = {
  teaching: {
    summaryInstruction: "第一段直接说明当前最值得做的一步，不要空泛铺垫。",
    sections: [
      {
        title: "当前建议",
        instruction: "给 1-3 条围绕当前关卡的具体建议。",
      },
      {
        title: "关键提醒",
        instruction: "说明最容易忽略的验证点、边界或误区。",
      },
    ],
    requiredActionExample:
      "继续当前关卡｜请根据当前上下文告诉我接下来最小的一步应该做什么。",
  },
  blocked_help: {
    summaryInstruction: "第一段先判断用户卡在哪里，并指出先排查什么。",
    sections: [
      {
        title: "问题判断",
        instruction: "概括当前最可能的问题来源，不要一次罗列太多假设。",
      },
      {
        title: "排查步骤",
        instruction: "给 2-4 条按顺序执行的排查动作。",
      },
      {
        title: "关键提醒",
        instruction: "提醒用户优先补哪些上下文或证据，避免盲改。",
      },
    ],
    requiredActionExample:
      "补充报错信息｜请先补充完整报错文本、触发步骤和最近一次修改内容。",
  },
  task_review: {
    summaryInstruction: "第一段先给复盘结论，明确做对了什么或还差什么。",
    sections: [
      {
        title: "复盘结论",
        instruction: "概括这一步当前的完成质量或主要缺口。",
      },
      {
        title: "做对了什么",
        instruction: "列 1-3 条当前已经正确的点。",
      },
      {
        title: "下一步缺口",
        instruction: "指出最该补的 1-2 个缺口。",
      },
    ],
    requiredActionExample:
      "帮我复盘结果｜请根据我刚才的结果，帮我做一次简短复盘。",
  },
  completion_feedback: {
    summaryInstruction: "第一段先确认当前关卡已经完成，并给一句成长反馈。",
    sections: [
      {
        title: "完成确认",
        instruction: "说明当前关卡为什么算完成。",
      },
      {
        title: "本次收获",
        instruction: "列 1-3 条用户刚建立的能力或判断标准。",
      },
      {
        title: "下一步建议",
        instruction: "说明进入下一关前最该延续的动作。",
      },
    ],
    requiredActionExample:
      "继续下一步｜请根据我刚完成的结果，告诉我当前最值得做的下一步。",
  },
  path_guidance: {
    summaryInstruction: "第一段直接回答当前下一步是什么，以及为什么先做它。",
    sections: [
      {
        title: "当前建议",
        instruction: "用 1-3 条建议说明应先做什么。",
      },
      {
        title: "验证方式",
        instruction: "写清楚如何判断这一步已经完成。",
      },
      {
        title: "关键提醒",
        instruction: "指出容易做大、做散或忽略的地方。",
      },
    ],
    requiredActionExample:
      "继续当前关卡｜请根据当前上下文告诉我接下来最小的一步应该做什么。",
  },
}

export function getLearningOutputFormatTemplate(
  interactionType: LearningInteractionType,
) {
  return OUTPUT_FORMAT_TEMPLATES[interactionType]
}

export function buildLearningOutputFormatGuide(
  interactionType: LearningInteractionType,
) {
  const template = getLearningOutputFormatTemplate(interactionType)

  return [
    "# 输出格式要求",
    "请严格使用可读的 Markdown 模板输出，保留二级标题。",
    template.summaryInstruction,
    ...template.sections.flatMap((section) => [
      `## ${section.title}`,
      section.instruction,
    ]),
    "## 建议动作",
    "这里必须给 1-2 条可点击动作，并严格使用 `- 动作文案｜用户点击后应发送的话` 的格式。",
    `建议至少包含这一条动作：${template.requiredActionExample}`,
    "如果某部分确实没有内容，可以省略对应二级标题，但“建议动作”默认应保留。",
  ]
}
