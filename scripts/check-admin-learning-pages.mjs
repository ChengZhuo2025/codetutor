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

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

assert.match(
  listSource,
  /学习运营/,
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
  /状态时间线|步骤|最近会话|重新激活|归档|来源草稿|质量闸门|多模态提取/,
  "The admin learning detail should expose timeline, steps, recent sessions, material-plan quality, extraction summary, and status actions",
)

assert.match(
  detailSource,
  /当前路径未关联教程链接草稿|该学习路径不是由教程链接生成计划确认后创建/,
  "The admin learning detail should explain when a path has no linked material-plan draft",
)

assert.match(
  menuSource,
  /label: "学习运营".*active: true/s,
  "The admin menu should enable the learning operations entry",
)

console.log("Admin learning pages expose the expected operations IA.")
