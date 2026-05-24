export type LearningInteractionType =
  | "teaching"
  | "blocked_help"
  | "task_review"
  | "completion_feedback"
  | "path_guidance"
  | "concept_qa"

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
    summaryInstruction: "第一段直接点出当前最值得做的一步。如果仍在当前任务内，只能写“下一步/下一项练习”，不能写“下一关”或“已完成第 N 关”。如果用户正在询问概念性知识，则不必拘泥于模板，直接以问答形式清晰解答即可。",
    sections: [
      {
        title: "当前建议",
        instruction: "给出 1-3 条围绕当前任务的具体建议。若用户询问的是概念问题，此部分可省略或替换为解答。",
      },
      {
        title: "关键提醒",
        instruction: "说明最容易忽略的验证点、边界或误区。若用户询问概念问题，此部分可替换为相关注意事项。",
      },
    ],
    requiredActionExample:
      "我应该先做哪一步？｜我应该先做哪一步？请结合当前任务给我一个最小可执行动作。",
  },
  blocked_help: {
    summaryInstruction: "第一段先对用户的挫败感表示理解，然后判断卡在哪里，并指出先排查什么。",
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
      "我卡在这里了，帮我定位｜我卡在这里了，现象是：请帮我定位最可能的问题。",
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
  concept_qa: {
    summaryInstruction: "直接以问答形式回答用户的技术概念问题，清晰、简洁，不必套用模板结构。",
    sections: [],
    requiredActionExample:
      "继续提问｜我还想再问一个相关的问题。",
  },
  completion_feedback: {
    summaryInstruction: "第一段先确认当前关已经完成，并给一句成长反馈。不要写“第 N 关已完成”，后续推进称为“下一关”。",
    sections: [
      {
        title: "完成确认",
        instruction: "说明当前任务为什么算完成。",
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
      "这是我的结果，请帮我判断｜这是我的结果，请帮我判断是否达到当前任务的完成标准：",
  },
  path_guidance: {
    summaryInstruction: "第一段直接回答当前下一步是什么，以及为什么先做它；如果仍在当前任务内推进，只能写“下一步/下一项练习”，不能写“下一关”或“已完成第 N 关”。",
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
      "我应该先做哪一步？｜我应该先做哪一步？请结合当前任务给我一个最小可执行动作。",
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

  if (interactionType === "concept_qa") {
    return [
      "# 输出格式要求",
      template.summaryInstruction,
      "在回答末尾，可以提供 1-2 个相关建议动作供用户继续提问，格式为 `- 动作文案｜用户点击后应发送的话`。",
      `可选动作示例：${template.requiredActionExample}`,
    ]
  }

  return [
    "# 输出格式要求",
    "请优先使用可读的 Markdown 组织内容，保留二级标题。",
    template.summaryInstruction,
    ...template.sections.flatMap((section) => [
      `## ${section.title}`,
      section.instruction,
    ]),
    "## 建议问题",
    "提供 1-2 条用户视角的建议问题或回复模板，并使用 `- 动作文案｜用户点击后应填入输入框的话` 的格式。",
    `可参考动作：${template.requiredActionExample}`,
    "不要在这里输出“我完成了”等系统进度动作；当前关未验收合格时不要输出“继续下一关”“进入下一关”“第 N 关已完成”。教学模板中的某部分如果确实没有内容，可以省略对应二级标题；概念问答场景可以完全省略“建议问题”。",
  ]
}
