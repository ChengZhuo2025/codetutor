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
const notificationCollectionSource = readFileSync(
  new URL("../lib/notifications/in-app-collection.ts", import.meta.url),
  "utf8",
)
const sidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const notificationSettingsDialogSource = readFileSync(
  new URL("../components/layout/notification-settings-dialog.tsx", import.meta.url),
  "utf8",
)
const notificationDetailDialogSource = readFileSync(
  new URL("../components/layout/notification-detail-dialog.tsx", import.meta.url),
  "utf8",
)
const inAppDisplaySource = readFileSync(
  new URL("../lib/notifications/in-app-display.ts", import.meta.url),
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
  sidebarSource,
  /getInAppNotificationListTitle/,
  "DashboardSidebar should use dynamic in-app notification titles",
)

assert.match(
  notificationDetailDialogSource,
  /getInAppNotificationListTitle/,
  "NotificationDetailDialog should use dynamic in-app notification titles",
)

assert.match(
  inAppDisplaySource,
  /formatRelativeDayLabel/,
  "in-app-display should format relative calendar labels for notifications",
)

assert.match(
  sidebarProviderSource,
  /dedupeSidebarNotifications/,
  "WorkspaceSidebarDataProvider should use the shared sidebar notification dedupe helper",
)

assert.match(
  notificationCollectionSource,
  /dedupeByDay/,
  "Sidebar notification collection logic should only dedupe items explicitly marked for day-level collapse",
)

assert.match(
  notificationSettingsDialogSource,
  /requestData<NotificationSettingsData>\("\/notifications\/settings"/,
  "NotificationSettingsDialog should load notification settings from the API",
)

assert.match(
  notificationSettingsDialogSource,
  /method:\s*"PATCH"/,
  "NotificationSettingsDialog should persist notification settings through PATCH",
)

console.log("Analytics reporting and notification UI are wired to the real APIs.")
