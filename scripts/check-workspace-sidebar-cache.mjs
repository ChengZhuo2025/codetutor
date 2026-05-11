import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const sidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const workspaceLayoutSource = readFileSync(
  new URL("../app/(workspace)/layout.tsx", import.meta.url),
  "utf8",
)
const providerSource = readFileSync(
  new URL("../providers/workspace-sidebar-provider.tsx", import.meta.url),
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
  workspaceLayoutSource,
  /WorkspaceSidebarDataProvider/,
  "Workspace layout should mount the shared workspace sidebar data provider.",
)

assert.match(
  providerSource,
  /SubscriptionMeResponseData/,
  "Workspace sidebar data provider should load the current subscription snapshot.",
)

assert.match(
  providerSource,
  /requestData<SubscriptionMeResponseData>\("\/subscription\/me"\)/,
  "Workspace sidebar data provider should fetch /subscription/me.",
)

assert.match(
  sidebarSource,
  /subscription/,
  "DashboardSidebar should render subscription data from the shared provider.",
)

assert.doesNotMatch(
  sidebarSource,
  /const subscription = SUBSCRIPTION_PLACEHOLDER/,
  "DashboardSidebar should not always use the static subscription placeholder.",
)

console.log("Workspace sidebar data is shared through a persistent provider.")
