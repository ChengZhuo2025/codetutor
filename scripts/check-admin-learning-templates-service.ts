import test from "node:test"
import assert from "node:assert/strict"

import {
  isSyncableInitialSelfDirectedPath,
  parseGeneratedTemplateJson,
  validateTemplateUpsert,
} from "../server/modules/admin-learning-templates/logic.ts"

const validStep = {
  title: "整理学习目标",
  summary: "确认当前学习材料和目标。",
  focus: "先把范围说清楚。",
  goal: "写出一个本周可执行目标。",
  completionCriteria: "能提交目标和下一步动作。",
  reviewSummary: "复盘目标是否足够具体。",
  estimatedMinutes: 20,
  rewardScore: 10,
  knowledgePoints: ["目标拆解"],
  keyPoints: ["能描述当前材料"],
  pitfalls: ["不要一次塞太多内容"],
  lessonBrief: "先整理材料，再开始练习。",
  practiceSteps: ["列出材料", "写出目标"],
  submissionGuide: "提交目标文字。",
  checkpoints: ["目标可执行"],
}

test("template upsert validation accepts a minimal self-directed template", () => {
  const result = validateTemplateUpsert({
    toolCode: "codex",
    learningLevel: "intermediate",
    name: "Codex 自学初始化模板",
    description: "帮助用户进入自学模式。",
    preview: ["先整理材料"],
    isActive: true,
    steps: [validStep],
    changeReason: "初始化模板",
  })

  assert.equal(result.ok, true)
})

test("template upsert validation rejects empty steps and negative rewards", () => {
  const result = validateTemplateUpsert({
    toolCode: "codex",
    learningLevel: "intermediate",
    name: "A",
    description: null,
    preview: [],
    isActive: true,
    steps: [{ ...validStep, rewardScore: -1 }],
    changeReason: "初始化模板",
  })

  assert.equal(result.ok, false)
  assert.match(result.errors.join(" "), /模板名称至少需要 2 个字符/)
  assert.match(result.errors.join(" "), /奖励分不能为负数/)
})

test("generated template parser extracts fenced JSON and normalizes steps", () => {
  const parsed = parseGeneratedTemplateJson(`
\`\`\`json
{
  "name": "Codex CLI 自学模式",
  "description": "先建立可持续学习节奏。",
  "preview": ["整理材料", "拆出下一步"],
  "steps": [
    {
      "title": "整理学习材料",
      "summary": "把当前教程和问题收拢到一个清单。",
      "focus": "避免一上来就让 AI 代做。",
      "goal": "形成一个可执行学习入口。",
      "completionCriteria": "提交材料清单和第一个问题。",
      "reviewSummary": "确认材料是否能支撑下一步。",
      "estimatedMinutes": 30,
      "rewardScore": 20,
      "knowledgePoints": ["自学材料整理"],
      "keyPoints": ["能描述自己要学什么"],
      "pitfalls": ["目标过大"],
      "lessonBrief": "先把材料和目标写清楚。",
      "practiceSteps": ["列出材料", "写出问题"],
      "submissionGuide": "提交材料清单。",
      "checkpoints": ["材料清单完整"]
    }
  ]
}
\`\`\`
`)

  assert.equal(parsed.name, "Codex CLI 自学模式")
  assert.equal(parsed.steps.length, 1)
  assert.equal(parsed.steps[0]?.completionCriteria, "提交材料清单和第一个问题。")
})

test("syncable path predicate only allows unstarted onboarding-created self-directed paths", () => {
  assert.equal(
    isSyncableInitialSelfDirectedPath({
      id: "path-1",
      selection_mode: "self_directed",
      status: "active",
      completed_steps: 0,
      metadata: { seedSource: "api_onboarding_complete" },
    }),
    true,
  )

  assert.equal(
    isSyncableInitialSelfDirectedPath({
      id: "path-2",
      selection_mode: "self_directed",
      status: "active",
      completed_steps: 1,
      metadata: { seedSource: "api_onboarding_complete" },
    }),
    false,
  )

  assert.equal(
    isSyncableInitialSelfDirectedPath({
      id: "path-3",
      selection_mode: "self_directed",
      status: "active",
      completed_steps: 0,
      metadata: { seedSource: "plan_draft_confirmed" },
    }),
    false,
  )
})
