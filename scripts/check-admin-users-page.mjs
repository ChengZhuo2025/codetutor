import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const listSource = readFileSync(
  new URL("../features/admin-users/components/user-list.tsx", import.meta.url),
  "utf8",
)

const detailSource = readFileSync(
  new URL("../features/admin-users/components/user-detail.tsx", import.meta.url),
  "utf8",
)

assert.match(
  listSource,
  /当前筛选用户/,
  "The admin users list should expose the top-level filtered user metric card",
)

assert.match(
  listSource,
  /本页已完成引导/,
  "The admin users list should surface onboarding completion stats in the top card row",
)

assert.match(
  listSource,
  /任务完成率/,
  "The admin users list table should expose a task completion column",
)

assert.match(
  listSource,
  /查看工单|工单/,
  "The admin users list should expose an operation entry to the feedback workspace",
)

assert.match(
  detailSource,
  /用户概览/,
  "The admin user detail page should render the overview-first tab",
)

assert.match(
  detailSource,
  /学习详情/,
  "The admin user detail page should render the learning detail tab",
)

assert.match(
  detailSource,
  /反馈关联/,
  "The admin user detail page should expose the feedback relation tab",
)

assert.match(
  detailSource,
  /运营侧资料编辑/,
  "The admin user detail page should keep the editable profile area as a side card instead of the main view",
)

assert.match(
  detailSource,
  /\/admin\/feedback\?userId=/,
  "The admin user detail page should deep-link into the filtered feedback list for the current user",
)

assert.match(
  detailSource,
  /\/admin\/feedback\?userId=\$\{encodeURIComponent\(userId\)\}&limit=5&page=1/,
  "The admin user detail page should fetch a real feedback summary for the current user",
)

console.log("Admin users pages keep the upgraded operations IA and feedback linkage.")
