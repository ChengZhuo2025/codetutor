import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const appProvidersSource = readFileSync(
  new URL("../providers/app-providers.tsx", import.meta.url),
  "utf8",
)
const sidebarProviderSource = readFileSync(
  new URL("../providers/workspace-sidebar-provider.tsx", import.meta.url),
  "utf8",
)
const sidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const notificationDialogSource = readFileSync(
  new URL("../components/layout/notification-settings-dialog.tsx", import.meta.url),
  "utf8",
)

assert.match(
  appProvidersSource,
  /fetch\("\/api\/analytics\/event"/,
  "AppProviders should post tracked events to /api/analytics/event",
)

assert.match(
  sidebarProviderSource,
  /requestData<NotificationInAppListResponseData>\("\/notifications\/in-app"\)/,
  "WorkspaceSidebarDataProvider should fetch in-app notifications",
)

assert.match(
  sidebarSource,
  /学习提醒/,
  "DashboardSidebar should render the learning reminder card",
)

assert.match(
  notificationDialogSource,
  /requestData<NotificationSettingsData>\("\/notifications\/settings"/,
  "NotificationSettingsDialog should load notification settings from the API",
)

assert.match(
  notificationDialogSource,
  /method:\s*"PATCH"/,
  "NotificationSettingsDialog should persist notification settings through PATCH",
)

console.log("Analytics reporting and notification UI are wired to the real APIs.")
