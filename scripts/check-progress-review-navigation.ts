import test from "node:test"
import assert from "node:assert/strict"

import {
  buildLearningReviewHref,
  resolveStageReviewSummary,
} from "../features/progress/lib/review-navigation.ts"

test("resolveStageReviewSummary prefers explicit review summary when present", () => {
  assert.equal(
    resolveStageReviewSummary({
      title: "理解 Ask 与 Agent 的区别",
      reviewSummary: "你已经理解两种协作方式的边界。",
      keyPoints: ["知道 Ask 更适合问概念", "知道 Agent 更适合推动执行"],
      summary: "理解 Ask 与 Agent 的区别。",
      goal: "能够判断当前问题更适合哪种模式。",
    }),
    "你已经理解两种协作方式的边界。",
  )
})

test("resolveStageReviewSummary falls back to key points when review summary is empty", () => {
  assert.equal(
    resolveStageReviewSummary({
      title: "理解 Ask 与 Agent 的区别",
      reviewSummary: "   ",
      keyPoints: ["知道 Ask 更适合问概念", "知道 Agent 更适合推动执行"],
      summary: "理解 Ask 与 Agent 的区别。",
      goal: "能够判断当前问题更适合哪种模式。",
    }),
    "你已经完成「理解 Ask 与 Agent 的区别」，本关重点包括：知道 Ask 更适合问概念；知道 Agent 更适合推动执行。",
  )
})

test("resolveStageReviewSummary falls back to summary or goal when key points are unavailable", () => {
  assert.equal(
    resolveStageReviewSummary({
      title: "完成第一个最小示例",
      reviewSummary: null,
      keyPoints: [],
      summary: "你已经跑通第一个最小示例，并知道如何验证结果。",
      goal: "完成一次最小实践。",
    }),
    "你已经跑通第一个最小示例，并知道如何验证结果。",
  )
})

test("buildLearningReviewHref preserves task selection and preferred session selection", () => {
  assert.equal(
    buildLearningReviewHref({
      taskId: "task-123",
      reviewSessionId: "session-456",
    }),
    "/learn?taskId=task-123&sessionId=session-456",
  )
})

test("buildLearningReviewHref still includes taskId when no review session exists", () => {
  assert.equal(
    buildLearningReviewHref({
      taskId: "task-123",
      reviewSessionId: null,
    }),
    "/learn?taskId=task-123",
  )
})
