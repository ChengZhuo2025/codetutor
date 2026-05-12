import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const listSource = readFileSync(
  new URL("../features/admin-learning/components/learning-path-list.tsx", import.meta.url),
  "utf8",
)

const detailSource = readFileSync(
  new URL("../features/admin-learning/components/learning-path-detail.tsx", import.meta.url),
  "utf8",
)
const detailPageSource = readFileSync(
  new URL("../features/admin-learning/components/learning-path-detail-page.tsx", import.meta.url),
  "utf8",
)
const draftPageSource = readFileSync(
  new URL("../features/admin-learning/components/learning-path-draft-page.tsx", import.meta.url),
  "utf8",
)
const sessionsPageSource = readFileSync(
  new URL("../features/admin-learning/components/learning-path-sessions-page.tsx", import.meta.url),
  "utf8",
)
const detailDirPageSource = readFileSync(
  new URL("../app/(admin-shell)/admin/learning/[pathId]/page.tsx", import.meta.url),
  "utf8",
)
const draftDirPageSource = readFileSync(
  new URL("../app/(admin-shell)/admin/learning/[pathId]/draft/page.tsx", import.meta.url),
  "utf8",
)
const sessionsDirPageSource = readFileSync(
  new URL("../app/(admin-shell)/admin/learning/[pathId]/sessions/page.tsx", import.meta.url),
  "utf8",
)

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

assert.match(
  listSource,
  /学习记录/,
  "The admin learning list should render the learning-ops title",
)

assert.match(
  listSource,
  /总路径数|进行中|已中断|已完成/,
  "The admin learning list should expose summary metric cards",
)

assert.match(
  listSource,
  /关键词|全部状态|全部工具|全部等级|最近更新时间|详情/,
  "The admin learning list should expose filters and detail navigation",
)

assert.match(
  detailSource,
  /状态时间线|步骤|最近会话|重新激活|归档|来源草稿|查看草稿详情|查看全部会话/,
  "The admin learning detail should expose timeline, steps, recent sessions, material-plan summary, and drill-down actions",
)

assert.match(
  detailSource,
  /教案排查|先理解方法|跟着做|提交说明|AI 检查点/,
  "The admin learning detail should expose lesson fields for generated-plan QA",
)

assert.match(
  detailSource,
  /当前路径未关联教程链接草稿|该学习路径不是由教程链接生成计划确认后创建/,
  "The admin learning detail should explain when a path has no linked material-plan draft",
)

assert.match(
  detailPageSource,
  /LearningPathDetail/,
  "The learning detail page should still render the overview detail component",
)

assert.match(
  draftPageSource,
  /来源草稿详情|来源明细|质量闸门/,
  "The material-plan draft detail page should expose draft overview, quality gate, and source breakdown",
)

assert.match(
  sessionsPageSource,
  /全部会话|会话列表|会话详情|Prompt Tokens|Completion Tokens/,
  "The sessions page should expose list and detail views with token metrics",
)

assert.match(
  detailDirPageSource,
  /LearningPathDetailPage/,
  "The app route should mount the learning detail page entry",
)

assert.match(
  draftDirPageSource,
  /LearningPathDraftDetailPage/,
  "The draft route should mount the material-plan detail page entry",
)

assert.match(
  sessionsDirPageSource,
  /LearningPathSessionsDetailPage/,
  "The sessions route should mount the sessions detail page entry",
)

assert.match(
  menuSource,
  /label: "学习记录".*active: true/s,
  "The admin menu should enable the learning operations entry",
)

console.log("Admin learning pages expose the expected operations IA.")
