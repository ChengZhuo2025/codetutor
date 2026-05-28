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
  /grid grid-cols-3 gap-2\.5/,
  "history card meta should occupy a dedicated three-column row",
)

assert.match(
  historyCardSource,
  /flex justify-end gap-2/,
  "history card actions should occupy a separate right-aligned row",
)

assert.match(
  historyCardSource,
  /w-\[calc\(50%-0\.25rem\)\][\s\S]*max-w-\[160px\]/,
  "history card action buttons should stay parallel with a maximum width",
)

assert.match(
  historyCardSource,
  /variant="destructiveSoft"[\s\S]*删除记录/,
  "history card delete buttons should use the same soft destructive style as order cards",
)

assert.match(
  historyCardSource,
  /historyReviewButtonClass[\s\S]*bg-green-600[\s\S]*学习复盘/,
  "history review action should use a distinct success color from the continue action",
)

assert.match(
  historyCardSource,
  /min-h-11/,
  "history card action buttons should keep 44px mobile touch targets",
)

console.log("History page reactivate flow covers abandoned plans and active-plan conflicts.")
