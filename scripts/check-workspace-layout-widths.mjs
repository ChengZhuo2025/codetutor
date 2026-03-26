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
  /export\s+const\s+WORKSPACE_ASIDE_WIDTH_CLASS\s*=\s*"xl:w-\[22rem\]"/,
  "workspace layout should define a shared aside width class",
)

const pageFiles = [
  "features/learning/pages/learn-page.tsx",
  "features/progress/pages/map-page.tsx",
  "features/achievement/pages/achievements-page.tsx",
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
  /import\s+\{\s*WORKSPACE_SIDEBAR_WIDTH_CLASS\s*\}\s+from\s+"@\/constants\/workspace-layout"/,
  "WorkspaceSidebar should import WORKSPACE_SIDEBAR_WIDTH_CLASS",
)
assert.match(
  sidebarSource,
  /widthClass=\{mobile\s*\?\s*"w-full"\s*:\s*WORKSPACE_SIDEBAR_WIDTH_CLASS\}/,
  "WorkspaceSidebar should use the shared desktop sidebar width class",
)

console.log("Workspace layout widths are consistent across pages.")
