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

const editSheetSource = readFileSync(
  new URL("../features/admin-users/components/user-edit-sheet.tsx", import.meta.url),
  "utf8",
)

assert.match(
  listSource,
  /总用户数/,
  "The admin users list should expose a global total-users metric card",
)

assert.match(
  listSource,
  /进行中计划/,
  "The admin users list should surface global active-plan stats in the top card row",
)

assert.doesNotMatch(
  listSource,
  /本页样本|本页有进行中计划|本页连续打卡|本页已删除/,
  "The admin users list top cards should no longer present page-sample wording",
)

assert.match(
  listSource,
  /任务完成率/,
  "The admin users list table should expose a task completion column",
)

assert.match(
  listSource,
  /item\.authPhone \|\| "暂无手机号"/,
  "The admin users list should prioritize phone number over user id in the user column",
)

assert.match(
  listSource,
  /item\.primaryToolName \?\? "未设置工具".*formatAdminLearningLevelLabel.*formatAdminSelectionModeLabel/s,
  "The current plan column should render tool, level, and mode on the same metadata line",
)

assert.doesNotMatch(
  listSource,
  /全部引导状态|已完成引导|引导<\/|引导状态/,
  "The admin users list should remove the redundant onboarding column and onboarding filter",
)

assert.match(
  listSource,
  /编辑/,
  "The admin users list should expose an edit action",
)

assert.match(
  editSheetSource,
  /SheetContent side="right" className="w-full sm:max-w-md xl:max-w-\[26vw\]"/,
  "The admin users edit action should open in a right-side sheet",
)

assert.match(
  editSheetSource,
  /手机号|当前头像仅展示，不可在此处修改。/,
  "The admin users edit sheet should show read-only phone and avatar fields",
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
  /账号操作|只读快照/,
  "The admin user detail page should focus on overview content instead of embedding the edit form",
)

assert.doesNotMatch(
  detailSource,
  /运营侧资料编辑/,
  "The admin user detail page should no longer embed the edit form directly",
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
