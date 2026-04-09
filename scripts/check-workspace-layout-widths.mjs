import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const layoutFile = "constants/workspace-layout.ts"
const layoutSource = readFileSync(new URL(`../${layoutFile}`, import.meta.url), "utf8")

assert.match(
  layoutSource,
  /export\s+const\s+WORKSPACE_SIDEBAR_WIDTH_CLASS\s*=\s*"w-72"/,
  "workspace layout should define a shared sidebar width class",
)
assert.match(
  layoutSource,
  /export\s+const\s+WORKSPACE_SIDEBAR_COLLAPSED_WIDTH_CLASS\s*=\s*"w-\[[^\"]+\]"/,
  "workspace layout should define a shared collapsed sidebar width class",
)
assert.match(
  layoutSource,
  /export\s+const\s+WORKSPACE_ASIDE_WIDTH_CLASS\s*=\s*"xl:w-\[22rem\]"/,
  "workspace layout should define a shared aside width class",
)

const pageFiles = [
  "features/learning/pages/learn-page.tsx",
  "features/progress/pages/map-page.tsx",
  "features/achievement/pages/achievements-page.tsx",
  "features/history/pages/history-page.tsx",
]

for (const file of pageFiles) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

  assert.match(
    source,
    /import\s+\{\s*WORKSPACE_ASIDE_WIDTH_CLASS\s*\}\s+from\s+"@\/constants\/workspace-layout"/,
    `${file} should import WORKSPACE_ASIDE_WIDTH_CLASS`,
  )
  assert.match(
    source,
    /asideClassName=\{WORKSPACE_ASIDE_WIDTH_CLASS\}/,
    `${file} should use WORKSPACE_ASIDE_WIDTH_CLASS`,
  )
  assert.doesNotMatch(
    source,
    /asideClassName="xl:w-\[(21|22|26)rem\]"/,
    `${file} should not hardcode desktop aside widths`,
  )
}

const sidebarSource = readFileSync(
  new URL("../components/layout/workspace-sidebar.tsx", import.meta.url),
  "utf8",
)

assert.match(
  sidebarSource,
  /import\s+\{[\s\S]*WORKSPACE_SIDEBAR_WIDTH_CLASS[\s\S]*\}\s+from\s+"@\/constants\/workspace-layout"/,
  "WorkspaceSidebar should import the shared workspace sidebar width constants",
)
assert.match(
  sidebarSource,
  /widthClass=\{[\s\S]*mobile[\s\S]*"w-full"[\s\S]*WORKSPACE_SIDEBAR_COLLAPSED_WIDTH_CLASS[\s\S]*WORKSPACE_SIDEBAR_WIDTH_CLASS[\s\S]*\}/,
  "WorkspaceSidebar should switch between the shared expanded and collapsed desktop sidebar width classes",
)

console.log("Workspace layout widths are consistent across pages.")
