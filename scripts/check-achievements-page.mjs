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
  /mobileNavVariant="minimal"/,
  "The /achievements mobile shell should use the same minimal nav as /learn and /map",
)

assert.match(
  pageSource,
  /showMobileBrand=\{false\}/,
  "The /achievements mobile shell should hide the brand eyebrow like /learn and /map",
)

assert.match(
  pageSource,
  /mobileSheetTopSpacing="compact"/,
  "The /achievements mobile side sheets should use compact top spacing like /learn and /map",
)

assert.match(
  pageSource,
  /border-b border-border\/50 bg-\[linear-gradient\(180deg,rgba\(255,255,255,0\.9\),rgba\(247,249,251,0\.82\)\)\] px-4 py-5 shadow-\[0_14px_38px_-34px_rgba\(15,23,42,0\.24\)\] backdrop-blur-sm dark:bg-\[linear-gradient\(180deg,oklch\(0\.19_0\.012_270\/0\.92\),oklch\(0\.16_0\.01_270\/0\.82\)\)\] sm:px-6/,
  "The /achievements header should use the same horizontal inset and updated gradient shell as /map",
)

assert.match(
  pageSource,
  /text-xl font-bold tracking-tight sm:text-2xl/,
  "The /achievements mobile header title should use text-xl before desktop sizing",
)

assert.match(
  pageSource,
  /ChevronDown[\s\S]*ChevronUp[\s\S]*setHeaderCollapsed/,
  "The /achievements mobile header should support default-collapsed expand and collapse behavior",
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
  /h-16 w-16[\s\S]*sm:h-20 sm:w-20[\s\S]*h-11 w-11 shrink-0 items-center justify-center[\s\S]*Icon icon=\{CurrentRankIcon\} width=\{40\} height=\{40\} className="block"/,
  "The current rank icon should use a compact mobile shell while keeping the approved fixed 40x40 icon size",
)

assert.match(
  rankCardSource,
  /flex flex-col gap-4 lg:flex-row lg:items-start/,
  "The current rank card should stack content on mobile and switch to horizontal layout on desktop",
)

assert.match(
  rankCardSource,
  /flex items-start gap-3 sm:gap-4/,
  "The current rank icon, name, and description should use a left-right layout on mobile",
)

assert.match(
  rankCardSource,
  /min-h-11 w-full[\s\S]*lg:w-auto/,
  "The current rank card CTAs should be full-width 44px touch targets on mobile",
)

assert.match(
  rankCardSource,
  /grid grid-cols-5 gap-2\.5 sm:gap-3/,
  "The rank progress stepper should stay compact and connected on mobile instead of falling back to a long one-column list",
)

assert.match(
  rankCardSource,
  /absolute left-\[calc\(50%\+18px\)\][\s\S]*right-\[calc\(-50%\+18px\)\][\s\S]*top-\[18px\]/,
  "The rank progress connector should render for the compact mobile stepper",
)

assert.match(
  badgeGridSource,
  /h-12 w-12[\s\S]*items-center justify-center rounded-\[16px\][\s\S]*sm:h-14 sm:w-14 sm:rounded-\[18px\][\s\S]*Icon[\s\S]*icon=\{badgeIcon\}[\s\S]*width=\{24\}[\s\S]*height=\{24\}/,
  "Badge icons should render at the approved fixed 24x24 size inside the compact responsive badge shell",
)

assert.match(
  badgeGridSource,
  /grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3/,
  "Achievement badges should use a two-column mobile grid",
)

const statsGridSource = readFileSync(
  new URL("../features/achievement/components/achievement-stats-grid.tsx", import.meta.url),
  "utf8",
)
const checkinCalendarSource = readFileSync(
  new URL("../features/achievement/components/checkin-calendar.tsx", import.meta.url),
  "utf8",
)

assert.match(
  statsGridSource,
  /grid grid-cols-2 gap-3 sm:gap-4/,
  "Achievement stat cards should use a compact two-column mobile grid",
)

assert.match(
  checkinCalendarSource,
  /grid grid-cols-2 gap-3 lg:grid-cols-4/,
  "Check-in stats should use a compact two-column mobile grid",
)

assert.match(
  checkinCalendarSource,
  /min-h-11 w-full[\s\S]*sm:w-auto/,
  "The check-in button should be a full-width 44px touch target on mobile",
)

assert.match(
  checkinCalendarSource,
  /grid grid-cols-7 gap-1\.5 sm:gap-2/,
  "The check-in calendar should tighten grid spacing on mobile",
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
