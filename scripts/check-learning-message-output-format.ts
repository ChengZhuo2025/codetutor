import test from "node:test"
import assert from "node:assert/strict"

import {
  buildLearningOutputFormatGuide,
  getLearningOutputFormatTemplate,
} from "../server/modules/learning/output-format.ts"

test("blocked_help output template requires diagnosis, troubleshooting steps and report-context action", () => {
  assert.deepEqual(getLearningOutputFormatTemplate("blocked_help"), {
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
  })
})

test("completion_feedback output guide includes completion-specific sections and action contract", () => {
  assert.deepEqual(buildLearningOutputFormatGuide("completion_feedback"), [
    "# 输出格式要求",
    "请严格使用可读的 Markdown 模板输出，保留二级标题。",
    "第一段先确认当前关卡已经完成，并给一句成长反馈。",
    "## 完成确认",
    "说明当前关卡为什么算完成。",
    "## 本次收获",
    "列 1-3 条用户刚建立的能力或判断标准。",
    "## 下一步建议",
    "说明进入下一关前最该延续的动作。",
    "## 建议动作",
    "这里必须给 1-2 条可点击动作，并严格使用 `- 动作文案｜用户点击后应发送的话` 的格式。",
    "建议至少包含这一条动作：继续下一步｜请根据我刚完成的结果，告诉我当前最值得做的下一步。",
    "如果某部分确实没有内容，可以省略对应二级标题，但“建议动作”默认应保留。",
  ])
})
