import test from "node:test"
import assert from "node:assert/strict"

import {
  buildLearningOutputFormatGuide,
  getLearningOutputFormatTemplate,
} from "../server/modules/learning/output-format.ts"

test("blocked_help output template requires diagnosis, troubleshooting steps and report-context action", () => {
  assert.deepEqual(getLearningOutputFormatTemplate("blocked_help"), {
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
  })
})

test("completion_feedback output guide includes completion-specific sections and user-question contract", () => {
  assert.deepEqual(buildLearningOutputFormatGuide("completion_feedback"), [
    "# 输出格式要求",
    "请优先使用可读的 Markdown 组织内容，保留二级标题。",
    "第一段先确认当前关已经完成，并给一句成长反馈。不要写“第 N 关已完成”，后续推进称为“下一关”。",
    "## 完成确认",
    "说明当前任务为什么算完成。",
    "## 本次收获",
    "列 1-3 条用户刚建立的能力或判断标准。",
    "## 下一步建议",
    "说明进入下一关前最该延续的动作。",
    "## 建议问题",
    "提供 1-2 条用户视角的建议问题或回复模板，并使用 `- 动作文案｜用户点击后应填入输入框的话` 的格式。",
    "可参考动作：这是我的结果，请帮我判断｜这是我的结果，请帮我判断是否达到当前任务的完成标准：",
    "不要在这里输出“我完成了”等系统进度动作；当前关未验收合格时不要输出“继续下一关”“进入下一关”“第 N 关已完成”。教学模板中的某部分如果确实没有内容，可以省略对应二级标题；概念问答场景可以完全省略“建议问题”。",
  ])
})

test("path_guidance output guide keeps in-task progression distinct from real stage transitions", () => {
  assert.deepEqual(buildLearningOutputFormatGuide("path_guidance"), [
    "# 输出格式要求",
    "请优先使用可读的 Markdown 组织内容，保留二级标题。",
    "第一段直接回答当前下一步是什么，以及为什么先做它；如果仍在当前任务内推进，只能写“下一步/下一项练习”，不能写“下一关”或“已完成第 N 关”。",
    "## 当前建议",
    "用 1-3 条建议说明应先做什么。",
    "## 验证方式",
    "写清楚如何判断这一步已经完成。",
    "## 关键提醒",
    "指出容易做大、做散或忽略的地方。",
    "## 建议问题",
    "提供 1-2 条用户视角的建议问题或回复模板，并使用 `- 动作文案｜用户点击后应填入输入框的话` 的格式。",
    "可参考动作：我应该先做哪一步？｜我应该先做哪一步？请结合当前任务给我一个最小可执行动作。",
    "不要在这里输出“我完成了”等系统进度动作；当前关未验收合格时不要输出“继续下一关”“进入下一关”“第 N 关已完成”。教学模板中的某部分如果确实没有内容，可以省略对应二级标题；概念问答场景可以完全省略“建议问题”。",
  ])
})
