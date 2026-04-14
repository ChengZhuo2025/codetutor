import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const historyCardSource = readFileSync(
  new URL("../features/history/components/history-card.tsx", import.meta.url),
  "utf8",
)
const historyActionDialogSource = readFileSync(
  new URL("../features/history/components/history-action-dialog.tsx", import.meta.url),
  "utf8",
)
const historyPageSource = readFileSync(
  new URL("../features/history/pages/history-page.tsx", import.meta.url),
  "utf8",
)
const historyServiceSource = readFileSync(
  new URL("../server/modules/history/service.ts", import.meta.url),
  "utf8",
)

assert.match(
  historyCardSource,
  /item\.status === "interrupted"[\s\S]*\|\|[\s\S]*item\.status === "abandoned"/,
  "history card should expose the reactivate action for both interrupted and abandoned plans",
)

assert.match(
  historyActionDialogSource,
  /你当前已有一条进行中的学习计划，暂时不能同时启用「\$\{item\.title\}」/,
  "history action dialog should explain why a plan cannot be reactivated while another plan is active",
)

assert.match(
  historyActionDialogSource,
  /confirmLabel:\s*"去处理进行中计划"/,
  "history action dialog should direct users to the in-progress plan when reactivation is blocked",
)

assert.match(
  historyPageSource,
  /action === "reactivate"[\s\S]*pageSummary\.activeCount > 0/,
  "history page should detect active-plan conflicts before sending a reactivate request",
)

assert.match(
  historyPageSource,
  /router\.push\(ROUTES\.learn\)/,
  "history page should send users to the current learning workspace from the conflict dialog",
)

assert.match(
  historyServiceSource,
  /if \(!\["interrupted", "abandoned"\]\.includes\(path\.status\)\)/,
  "history service should allow both interrupted and abandoned plans to reactivate",
)

assert.match(
  historyServiceSource,
  /\.in\("status", \["interrupted", "abandoned"\]\)/,
  "history service should persist reactivation for both interrupted and abandoned paths",
)

console.log("History page reactivate flow covers abandoned plans and active-plan conflicts.")
