import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const mapPageSource = readFileSync(
  new URL("../features/progress/pages/map-page.tsx", import.meta.url),
  "utf8",
)
const mapHeaderSource = readFileSync(
  new URL("../features/progress/components/map-header.tsx", import.meta.url),
  "utf8",
)
const progressOverviewSource = readFileSync(
  new URL("../features/progress/components/progress-overview.tsx", import.meta.url),
  "utf8",
)
const mapDetailSource = readFileSync(
  new URL("../features/progress/components/stage-detail-panel.tsx", import.meta.url),
  "utf8",
)
const sharedPlanSource = readFileSync(
  new URL("../lib/mocks/current-learning-plan.ts", import.meta.url),
  "utf8",
)

assert.doesNotMatch(
  mapPageSource,
  /useState\("cursor"\)|activeTool|onToolChange=\{setActiveTool\}|tools=\{map\.tools\}/,
  "/map should no longer expose tool switching state or tabs",
)

assert.doesNotMatch(
  mapHeaderSource,
  /tools\.map\(/,
  "MapHeader should focus on the current learning plan instead of rendering tool tabs",
)

assert.doesNotMatch(
  mapHeaderSource,
  /累计 XP|连续学习|下一段位/,
  "The top header should stay focused on the current plan and avoid growth-metric cards",
)

assert.match(
  mapDetailSource,
  /学习复盘/,
  "Completed stages should use the student-facing CTA label `学习复盘`",
)

assert.doesNotMatch(
  mapDetailSource,
  /为什么这里不展开全部内容/,
  "The map detail panel should not include the removed explanatory footer block",
)

assert.match(
  mapPageSource,
  /<main className="flex min-h-0 flex-1 flex-col overflow-hidden">/,
  "The /map center column should clip overflow and delegate scrolling to the content area",
)

assert.match(
  mapPageSource,
  /<div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">/,
  "The /map content area should own vertical scrolling and hide the native scrollbar",
)

assert.match(
  mapPageSource,
  /mobileNavVariant="minimal"/,
  "The /map page should use the same minimal mobile nav treatment as /learn.",
)

assert.match(
  mapPageSource,
  /showMobileBrand=\{false\}/,
  "The /map mobile nav should hide the brand eyebrow like /learn.",
)

assert.match(
  mapPageSource,
  /mobileSheetTopSpacing="compact"/,
  "The /map mobile sheets should use compact top spacing like /learn.",
)

assert.match(
  mapPageSource,
  /renderAside=\{\(\{ mobile \}\) =>[\s\S]*compact=\{mobile\}/,
  "The /map aside renderer should pass mobile state into StageDetailPanel.",
)

assert.doesNotMatch(
  mapPageSource,
  /className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden sm:m-6"/,
  "The map timeline container should not clip the page with overflow-hidden",
)

assert.match(
  mapHeaderSource,
  /className="shrink-0 border-b border-border\/50 bg-\[linear-gradient\(180deg,rgba\(255,255,255,0\.9\),rgba\(247,249,251,0\.82\)\)\] px-4 py-5 shadow-\[0_14px_38px_-34px_rgba\(15,23,42,0\.24\)\] backdrop-blur-sm dark:bg-\[linear-gradient\(180deg,oklch\(0\.19_0\.012_270\/0\.92\),oklch\(0\.16_0\.01_270\/0\.82\)\)\] sm:px-6"/,
  "The map header should keep the approved static shell styling, inset, and updated light-theme gradient treatment",
)

assert.match(
  mapHeaderSource,
  /useState\(true\)/,
  "The map header should default to collapsed on mobile to preserve center content height.",
)

assert.match(
  mapHeaderSource,
  /ChevronDown|ChevronUp/,
  "The map header should expose a chevron toggle for expanding and collapsing the summary.",
)

assert.match(
  mapHeaderSource,
  /text-xl font-bold/,
  "The map header title should use text-xl instead of text-2xl.",
)

assert.doesNotMatch(
  mapHeaderSource,
  /sticky top-0 z-10/,
  "The current approved /map header should remain non-sticky",
)

assert.doesNotMatch(
  progressOverviewSource,
  /为什么先做当前关卡|地图页只负责帮你判断/,
  "The hero overview should avoid explanation-heavy copy blocks in prime viewport space",
)

assert.doesNotMatch(
  progressOverviewSource,
  /sm:grid-cols-3/,
  "The hero overview should not use a 3-card row that pushes the map list below the fold",
)

assert.match(
  progressOverviewSource,
  /summary\.currentRank/,
  "The growth rail should continue exposing the current-rank summary for quick progress context",
)

assert.match(
  progressOverviewSource,
  /grid-cols-\[minmax\(0,7fr\)_minmax\(0,3fr\)\]/,
  "The current-stage overview should use a 7:3 split for path progress and stage reward",
)

assert.match(
  progressOverviewSource,
  /w-full lg:w-\[75%\]/,
  "The current-stage text block should use full width on mobile and preserve the desktop 75% width.",
)

assert.match(
  progressOverviewSource,
  /min-h-11 w-full[\s\S]*lg:w-auto/,
  "The primary continue-learning CTA should be a full-width 44px touch target on mobile.",
)

assert.match(
  progressOverviewSource,
  /mt-6 text-xl font-bold/,
  "The current task card title should use text-xl on mobile.",
)

assert.match(
  progressOverviewSource,
  /grid grid-cols-3 gap-2\.5/,
  "The growth stat cards should render as three columns on mobile.",
)

assert.match(
  progressOverviewSource,
  /onOpenAchievements/,
  "The growth rail should remain wired to the achievements navigation action",
)

assert.doesNotMatch(
  progressOverviewSource,
  /本关完成后/,
  "The growth rail should not repeat the per-stage completion reward summary",
)

assert.doesNotMatch(
  progressOverviewSource,
  /查看我的成就/,
  "The growth rail should use card-level navigation instead of a footer button CTA",
)

assert.match(
  progressOverviewSource,
  /cursor-pointer/,
  "The growth rail should expose an interactive hover/click affordance at the card level",
)

assert.doesNotMatch(
  mapDetailSource,
  /后续规划/,
  "The map detail panel should stay focused and avoid low-value footer planning blocks",
)

assert.match(
  mapDetailSource,
  /compact\?: boolean/,
  "StageDetailPanel should expose a compact mobile variant.",
)

assert.match(
  mapDetailSource,
  /if \(compact\)/,
  "StageDetailPanel should render a dedicated compact mobile sheet branch.",
)

assert.match(
  mapDetailSource,
  /核心要点/,
  "The compact map detail panel should prioritize key points instead of desktop-density detail cards.",
)

assert.match(
  mapDetailSource,
  /min-h-11/,
  "StageDetailPanel CTA should keep a 44px mobile touch target.",
)

assert.match(
  progressOverviewSource,
  /min-h-11 w-full/,
  "ProgressOverview should keep its mobile CTA at a 44px touch target.",
)

const stageTimelineSource = readFileSync(
  new URL("../features/progress/components/stage-timeline.tsx", import.meta.url),
  "utf8",
)

assert.match(
  stageTimelineSource,
  /<button[\s\S]*type="button"[\s\S]*onKeyDown=\{\(event\) => \{/,
  "Stage timeline items should expose button semantics and keyboard activation.",
)

assert.match(
  stageTimelineSource,
  /min-h-11/,
  "Stage timeline actions should keep 44px mobile touch targets.",
)

assert.match(
  stageTimelineSource,
  /h-10 w-10[\s\S]*sm:h-12 sm:w-12/,
  "Stage timeline status nodes should be smaller on mobile and preserve desktop sizing.",
)

assert.match(
  stageTimelineSource,
  /absolute right-3 top-3/,
  "Stage timeline XP labels should float at the card top-right instead of consuming text width.",
)

assert.match(
  stageTimelineSource,
  /onOpenReview/,
  "Completed stages should expose a mobile review action instead of a static label.",
)

assert.match(
  stageTimelineSource,
  /done:[\s\S]*border-emerald-500\/45[\s\S]*bg-emerald-500[\s\S]*border-emerald-500\/20[\s\S]*bg-emerald-500\/10[\s\S]*text-emerald-700/,
  "Completed stage timeline cards should use success green surfaces instead of brand blue.",
)

assert.match(
  stageTimelineSource,
  /stage\.status === "done"[\s\S]*bg-emerald-500\/45/,
  "Completed stage timeline connectors should continue in success green.",
)

assert.match(
  stageTimelineSource,
  /border-emerald-500\/25 bg-emerald-500\/10[\s\S]*text-emerald-700/,
  "Completed stage review buttons should use success green styling.",
)

assert.match(
  sharedPlanSource,
  /pathName: `\$\{primaryToolName\} 零基础起步营`/,
  "Shared plan data should derive the current plan name from the shared primary tool label",
)

assert.match(
  sharedPlanSource,
  /理解 Ask 与 Agent 的区别/,
  "Shared plan data should align the current stage title across /learn and /map",
)

console.log("/map page structure stays aligned with the approved IA and /learn content.")
