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
  /lg:grid-cols-3/,
  "The current goal, completion criteria, and next unlock cards should render in a 3-column row on large screens",
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
