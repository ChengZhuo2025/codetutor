import test from "node:test"
import assert from "node:assert/strict"

import { assertHostnameAllowed } from "../server/modules/learning-materials/whitelist.ts"
import { MaterialPlanError } from "../server/modules/learning-materials/errors.ts"
import { resolveMaterialSourceAdapter } from "../server/modules/learning-materials/source-resolver.ts"
import { extractJsonObjectString } from "../server/modules/learning-plans/json-parse.ts"
import {
  plannerOutputSchema,
  validatePlannerBusinessRules,
} from "../server/modules/learning-plans/schema.ts"

test("assertHostnameAllowed accepts frozen whitelist hosts", () => {
  assert.doesNotThrow(() =>
    assertHostnameAllowed("https://developer.mozilla.org/en-US/docs/Web"),
  )
  assert.doesNotThrow(() => assertHostnameAllowed("https://nextjs.org/docs"))
  assert.doesNotThrow(() => assertHostnameAllowed("https://web.dev/learn/"))
})

test("assertHostnameAllowed rejects unknown host", () => {
  assert.throws(
    () => assertHostnameAllowed("https://example.com/a"),
    (e: unknown) => e instanceof MaterialPlanError,
  )
})

test("resolveMaterialSourceAdapter supports configured public platform sources", () => {
  assert.equal(
    resolveMaterialSourceAdapter("https://developer.mozilla.org/en-US/docs/Web").sourceCode,
    "html",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.douyin.com/video/123").sourceCode,
    "douyin",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.xiaohongshu.com/explore/123").sourceCode,
    "xiaohongshu",
  )
  assert.equal(
    resolveMaterialSourceAdapter("https://www.bilibili.com/video/BV1xx").sourceCode,
    "bilibili",
  )
})

test("extractJsonObjectString unwraps fenced json", () => {
  const raw = '前缀\n```json\n{"a":1}\n```\n后缀'
  assert.equal(extractJsonObjectString(raw), '{"a":1}')
})

test("plannerOutputSchema + business rules accept valid planner payload", () => {
  const raw = {
    title: "测试计划",
    goal: "完成最小闭环",
    tasks: [
      {
        taskNo: 1,
        title: "第一步",
        objective: "跑通环境",
        practiceSteps: ["安装", "运行"],
        acceptanceCriteria: "能启动",
        estimatedMinutes: 30,
        sourceRefs: ["c1"],
      },
      {
        taskNo: 2,
        title: "第二步",
        objective: "改页面",
        practiceSteps: ["编辑", "验证"],
        acceptanceCriteria: "页面更新",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "复盘",
        practiceSteps: ["记录", "计划下一步"],
        acceptanceCriteria: "有清单",
        sourceRefs: ["c1"],
      },
    ],
  }
  const parsed = plannerOutputSchema.parse(raw)
  assert.equal(validatePlannerBusinessRules(parsed), null)
})

test("validatePlannerBusinessRules rejects non-sequential taskNo", () => {
  const raw = {
    title: "测试计划",
    goal: "完成最小闭环",
    tasks: [
      {
        taskNo: 1,
        title: "第一步",
        objective: "a",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "x",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 3,
        title: "第三步",
        objective: "b",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "y",
        sourceRefs: ["c1"],
      },
      {
        taskNo: 4,
        title: "第四步",
        objective: "c",
        practiceSteps: ["a", "b"],
        acceptanceCriteria: "z",
        sourceRefs: ["c1"],
      },
    ],
  }
  const parsed = plannerOutputSchema.parse(raw)
  assert.ok(validatePlannerBusinessRules(parsed))
})
