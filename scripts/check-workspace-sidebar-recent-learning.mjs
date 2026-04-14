import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const source = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)

assert.match(
  source,
  /const visibleRecentPlans = recentLearningPlans\.slice\(0,\s*3\)/,
  "dashboard sidebar should limit recent learning plans to 3 items",
)

assert.match(
  source,
  /function getRecentLearningPlanHref\(status: LearningHistory\["status"\]\)[\s\S]*case "in_progress":[\s\S]*return ROUTES\.learn[\s\S]*default:[\s\S]*return ROUTES\.history[\s\S]*}/,
  "dashboard sidebar should map in-progress plans to /learn and other plans to /history",
)

assert.match(
  source,
  /<Link[\s\S]*key=\{plan\.id\}[\s\S]*href=\{getRecentLearningPlanHref\(plan\.status\)\}/,
  "recent learning entries should render as clickable links with status-based destinations",
)

console.log("Recent learning sidebar limits entries and links them to the correct destination.")
