import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const workspaceLayoutSource = readFileSync(
  new URL("../app/(workspace)/layout.tsx", import.meta.url),
  "utf8",
)
const providerSource = readFileSync(
  new URL("../providers/workspace-layout-provider.tsx", import.meta.url),
  "utf8",
)
const appShellSource = readFileSync(
  new URL("../components/layout/app-shell.tsx", import.meta.url),
  "utf8",
)
const workspaceSidebarSource = readFileSync(
  new URL("../components/layout/workspace-sidebar.tsx", import.meta.url),
  "utf8",
)
const dashboardSidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const settingsPopoverSource = readFileSync(
  new URL("../components/layout/settings-popover.tsx", import.meta.url),
  "utf8",
)
const learnChatSource = readFileSync(
  new URL("../features/learning/components/chat.tsx", import.meta.url),
  "utf8",
)
const historyPageSource = readFileSync(
  new URL("../features/history/pages/history-page.tsx", import.meta.url),
  "utf8",
)

assert.match(
  workspaceLayoutSource,
  /WorkspaceLayoutProvider/,
  "workspace layout should wrap pages with WorkspaceLayoutProvider",
)

assert.match(
  providerSource,
  /leftCollapsed/,
  "workspace layout provider should manage the shared left sidebar collapsed state",
)
assert.match(
  providerSource,
  /rightCollapsedByPage/,
  "workspace layout provider should manage per-page right panel collapsed state",
)
assert.match(
  providerSource,
  /localStorage/,
  "workspace layout provider should persist layout state to localStorage",
)

assert.match(
  appShellSource,
  /workspacePage/,
  "AppShell should accept a workspace page key for right panel persistence",
)
assert.match(
  appShellSource,
  /useWorkspaceLayout/,
  "AppShell should consume the shared workspace layout state",
)
assert.match(
  appShellSource,
  /ChevronLeft/,
  "AppShell should use a left chevron when the right panel is collapsed (pull in from the left)",
)
assert.match(
  appShellSource,
  /ChevronRight/,
  "AppShell should use a right chevron when the right panel is expanded (panel sits to the right)",
)
assert.match(
  appShellSource,
  /import\s+\{\s*Button\s*\}\s+from\s+"@\/components\/ui\/button"/,
  "AppShell right-side toggle should use the shared subtle button style via Button",
)
assert.match(
  appShellSource,
  /top-1\/2/,
  "AppShell should vertically center the right-side toggle on the viewport stack",
)
assert.match(
  appShellSource,
  /-translate-x-1\/2[\s\S]*-translate-y-1\/2/,
  "AppShell should center the toggle on the main/aside boundary (straddle)",
)
assert.match(
  appShellSource,
  /xl:inline-flex/,
  "AppShell should show the right-side toggle from the xl breakpoint",
)
assert.match(
  appShellSource,
  /variant="ghost"/,
  "AppShell right-side toggle should use the quieter ghost button variant",
)
assert.doesNotMatch(
  appShellSource,
  /USER_ICON_BUTTON_CLASS/,
  "AppShell right-side toggle should no longer use the loud filled icon button style",
)

assert.match(
  workspaceSidebarSource,
  /collapsed/,
  "WorkspaceSidebar should forward collapsed state to the dashboard sidebar",
)
assert.match(
  workspaceSidebarSource,
  /onToggleCollapsed/,
  "WorkspaceSidebar should forward a collapse toggle handler",
)

assert.match(
  dashboardSidebarSource,
  /collapsed\??:/,
  "DashboardSidebar should support a collapsed mini-rail mode",
)
assert.match(
  dashboardSidebarSource,
  /Tooltip/,
  "DashboardSidebar mini rail should expose icon tooltips",
)
assert.match(
  dashboardSidebarSource,
  /import\s+\{\s*Button\s*\}\s+from\s+"@\/components\/ui\/button"/,
  "DashboardSidebar collapse toggles should use the shared subtle Button styling",
)
assert.match(
  dashboardSidebarSource,
  /ThemeToggle/,
  "DashboardSidebar mini rail should keep the theme toggle available",
)
assert.match(
  dashboardSidebarSource,
  /variant="ghost"/,
  "DashboardSidebar collapse toggles should use the quieter ghost button variant",
)

assert.match(
  settingsPopoverSource,
  /z-\[(70|80|90)\]/,
  "SettingsPopover should raise its floating panel above the center workspace content",
)
assert.match(
  learnChatSource,
  /className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"/,
  "/learn header should lay out title and actions without reserving space for the aside toggle",
)
assert.match(
  historyPageSource,
  /className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"/,
  "/history header should flow title and actions without aside-toggle padding hacks",
)
assert.match(
  historyPageSource,
  /className="shrink-0 lg:mt-0"/,
  "/history header action should sit in the flex row without absolute positioning",
)

for (const [file, pageKey] of [
  ["features/learning/pages/learn-page.tsx", "learn"],
  ["features/progress/pages/map-page.tsx", "map"],
  ["features/achievement/pages/achievements-page.tsx", "achievements"],
  ["features/history/pages/history-page.tsx", "history"],
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
  assert.match(
    source,
    new RegExp(`workspacePage=\\\"${pageKey}\\\"`),
    `${file} should pass workspacePage="${pageKey}" to AppShell`,
  )
}

console.log("Workspace shell collapse wiring is present across the shared workspace shell.")
