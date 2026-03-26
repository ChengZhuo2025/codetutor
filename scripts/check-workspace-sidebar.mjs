import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const cases = [
  {
    file: "features/learning/pages/learn-page.tsx",
    activeHref: "ROUTES.learn",
  },
  {
    file: "features/progress/pages/map-page.tsx",
    activeHref: "ROUTES.map",
  },
  {
    file: "features/achievement/pages/achievements-page.tsx",
    activeHref: "ROUTES.achievements",
  },
]

for (const { file, activeHref } of cases) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

  assert.match(
    source,
    /import\s+\{\s*WorkspaceSidebar\s*\}\s+from\s+"@\/components\/layout\/workspace-sidebar"/,
    `${file} should import WorkspaceSidebar`,
  )
  assert.match(
    source,
    new RegExp(`<WorkspaceSidebar[\\s\\S]*activeHref=\\{${activeHref.replace(".", "\\.")}\\}`),
    `${file} should render WorkspaceSidebar with ${activeHref}`,
  )
  assert.doesNotMatch(
    source,
    /import\s+\{\s*DashboardSidebar\s*\}\s+from\s+"@\/components\/layout\/dashboard-sidebar"/,
    `${file} should not import DashboardSidebar directly`,
  )
  assert.doesNotMatch(
    source,
    /import\s+\{\s*LearnSidebar\s*\}\s+from\s+"@\/features\/learning\/components\/sidebar"/,
    `${file} should not import LearnSidebar directly`,
  )
}

console.log("Workspace sidebar usage is consistent across /learn, /map, and /achievements.")
