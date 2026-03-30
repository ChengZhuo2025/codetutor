import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const sidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const providersSource = readFileSync(
  new URL("../providers/app-providers.tsx", import.meta.url),
  "utf8",
)

assert.match(
  sidebarSource,
  /useWorkspaceSidebarData/,
  "DashboardSidebar should consume shared workspace sidebar data.",
)

assert.doesNotMatch(
  sidebarSource,
  /requestData<LearningCurrentSessionResponseData>\("\/learning\/current-session"\)/,
  "DashboardSidebar should not fetch current session on every mount.",
)

assert.doesNotMatch(
  sidebarSource,
  /requestData<ProfileMeResponseData>\("\/profile\/me"\)/,
  "DashboardSidebar should not fetch profile on every mount.",
)

assert.match(
  providersSource,
  /WorkspaceSidebarDataProvider/,
  "AppProviders should mount the shared workspace sidebar data provider.",
)

console.log("Workspace sidebar data is shared through a persistent provider.")
