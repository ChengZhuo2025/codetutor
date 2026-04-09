import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const pageSource = readFileSync(
  new URL("../features/achievement/pages/achievements-page.tsx", import.meta.url),
  "utf8",
)
const rankCardSource = readFileSync(
  new URL("../features/achievement/components/rank-progress-card.tsx", import.meta.url),
  "utf8",
)
const badgeGridSource = readFileSync(
  new URL("../features/achievement/components/badge-grid.tsx", import.meta.url),
  "utf8",
)
const dataSource = readFileSync(
  new URL("../features/achievement/data/achievement-data.ts", import.meta.url),
  "utf8",
)
const solidIconSource = readFileSync(
  new URL("../features/achievement/components/solid-achievement-icons.tsx", import.meta.url),
  "utf8",
)

assert.match(
  pageSource,
  /overflow-y-auto scrollbar-none px-4 py-4 sm:px-5 sm:py-5/,
  "The /achievements scroll area should keep the approved compact padding used by the current page design",
)

assert.match(
  pageSource,
  /border-b border-border\/50 bg-\[linear-gradient\(180deg,rgba\(255,255,255,0\.9\),rgba\(247,249,251,0\.82\)\)\] px-4 py-5 shadow-\[0_14px_38px_-34px_rgba\(15,23,42,0\.24\)\] backdrop-blur-sm dark:bg-\[linear-gradient\(180deg,oklch\(0\.19_0\.012_250\/0\.92\),oklch\(0\.16_0\.01_250\/0\.82\)\)\] sm:px-6/,
  "The /achievements header should use the same horizontal inset and updated gradient shell as /map",
)

assert.match(
  rankCardSource,
  /const CurrentRankIcon = currentRank\.icon;/,
  "The current rank card should render the active rank icon from mock data",
)

assert.doesNotMatch(
  rankCardSource,
  /{"<\/>"}/,
  "The current rank card should no longer render the literal code-bracket text",
)

assert.match(
  badgeGridSource,
  /const badgeIcon = badge\.icon/,
  "The badge grid should render badge icons from data",
)

assert.match(
  rankCardSource,
  /import \{ Icon \} from "@iconify\/react\/offline"/,
  "The current rank card should render icons with Iconify offline mode",
)

assert.match(
  badgeGridSource,
  /import \{ Icon \} from "@iconify\/react\/offline"/,
  "The badge grid should render icons with Iconify offline mode",
)

assert.match(
  rankCardSource,
  /h-20 w-20[\s\S]*h-11 w-11 shrink-0 items-center justify-center[\s\S]*Icon icon=\{CurrentRankIcon\} width=\{40\} height=\{40\} className="block"/,
  "The current rank icon should render at the approved fixed 40x40 size inside the larger card shell",
)

assert.match(
  badgeGridSource,
  /h-14 w-14[\s\S]*items-center justify-center rounded-\[18px\][\s\S]*Icon[\s\S]*icon=\{badgeIcon\}[\s\S]*width=\{24\}[\s\S]*height=\{24\}/,
  "Badge icons should render at the approved fixed 24x24 size inside the current badge shell",
)

assert.match(
  dataSource,
  /from "@\/features\/achievement\/components\/solid-achievement-icons"/,
  "Achievement mock data should source rank and badge icons from the solid icon set",
)

assert.match(
  solidIconSource,
  /import type \{ IconifyIcon \} from "@iconify\/types"/,
  "The local achievement icon subset should store official Iconify icon data",
)

assert.match(
  dataSource,
  /icon: SeedRankIcon[\s\S]*icon: OrbitRankIcon[\s\S]*icon: CodeRankIcon[\s\S]*icon: ForgeRankIcon[\s\S]*icon: CrownRankIcon/,
  "The five ranks should each define a distinct solid icon in the local presentation mapping",
)

assert.match(
  dataSource,
  /first_task: SparkBadgeIcon[\s\S]*seven_day_streak: FlameBadgeIcon[\s\S]*first_debug: TargetBadgeIcon[\s\S]*first_project: BuildBadgeIcon[\s\S]*multi_tool_master: MultiToolBadgeIcon[\s\S]*monthly_champion: TrophyBadgeIcon/,
  "The six badge cards should each define a solid icon in the local badge presentation mapping",
)

assert.match(
  pageSource,
  /(?:requestData|apiClient\.get)<AchievementSummaryResponseData>\("\/achievement\/summary"\)/,
  "The /achievements page should load growth data from the real /api/achievement/summary endpoint",
)

assert.doesNotMatch(
  solidIconSource,
  /opacity=/,
  "The custom achievement icon set should avoid translucent base layers",
)

console.log("/achievements page layout and icon mappings stay aligned with the updated UI design.")
