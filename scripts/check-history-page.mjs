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

assert.match(
  historyPageSource,
  /mobileNavVariant="minimal"/,
  "history page mobile shell should use the optimized minimal nav",
)

assert.match(
  historyPageSource,
  /showMobileBrand=\{false\}/,
  "history page mobile shell should hide the brand eyebrow",
)

assert.match(
  historyPageSource,
  /mobileSheetTopSpacing="compact"/,
  "history page mobile side sheets should use compact top spacing",
)

assert.match(
  historyPageSource,
  /ChevronDown[\s\S]*ChevronUp[\s\S]*setHeaderCollapsed/,
  "history page header should support default-collapsed mobile summary",
)

assert.match(
  historyPageSource,
  /text-xl font-bold tracking-tight sm:text-2xl/,
  "history page mobile title should use text-xl before desktop sizing",
)

assert.match(
  historyPageSource,
  /overflow-x-auto scrollbar-none/,
  "history filters should scroll horizontally on mobile",
)

assert.match(
  historyPageSource,
  /min-h-10 shrink-0 rounded-full/,
  "history filter buttons should keep compact fixed touch targets on mobile",
)

assert.match(
  historyCardSource,
  /rounded-\[22px\][\s\S]*p-4[\s\S]*sm:rounded-\[26px\][\s\S]*sm:p-5/,
  "history cards should use compact mobile padding and radius",
)

assert.match(
  historyCardSource,
  /text-base font-semibold leading-tight[\s\S]*sm:text-lg/,
  "history card titles should use compact mobile sizing",
)

assert.match(
  historyCardSource,
  /grid grid-cols-2 gap-2\.5[\s\S]*sm:grid-cols-3/,
  "history card meta should use a two-column mobile grid",
)

assert.match(
  historyCardSource,
  /col-span-2[\s\S]*sm:col-span-1/,
  "history card updated-at meta should span two mobile columns and collapse on desktop",
)

assert.match(
  historyCardSource,
  /grid grid-cols-2 gap-2[\s\S]*sm:flex/,
  "history card actions should use two-column full-width mobile buttons",
)

assert.match(
  historyCardSource,
  /min-h-11 w-full/,
  "history card action buttons should keep 44px mobile touch targets",
)

console.log("History page reactivate flow covers abandoned plans and active-plan conflicts.")
