import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const sidebarSource = readFileSync(
  new URL("../components/layout/dashboard-sidebar.tsx", import.meta.url),
  "utf8",
)
const notificationDialogSource = readFileSync(
  new URL("../components/layout/notification-detail-dialog.tsx", import.meta.url),
  "utf8",
)
const notificationServiceSource = readFileSync(
  new URL("../server/modules/notifications/service.ts", import.meta.url),
  "utf8",
)
const achievementsPageSource = readFileSync(
  new URL("../features/achievement/pages/achievements-page.tsx", import.meta.url),
  "utf8",
)
const checkinCalendarSource = readFileSync(
  new URL("../features/achievement/components/checkin-calendar.tsx", import.meta.url),
  "utf8",
)

assert.doesNotMatch(
  sidebarSource,
  /expiresAt:\s*"无期限"/,
  "The sidebar subscription placeholder must not hard-code an unlimited expiry.",
)
assert.match(
  sidebarSource,
  /formatSubscriptionExpiresAt\(\s*subscriptionData\?\.current\.expiresAt[\s\S]*subscriptionData\?\.current\.planCode[\s\S]*subscriptionData\?\.plans/s,
  "The sidebar should derive free-plan expiry from subscription data instead of falling back to unlimited.",
)

assert.match(
  notificationServiceSource,
  /actionHref:\s*`\$\{ROUTES\.achievements\}#checkin-records`/,
  "The daily check-in reminder should link directly to the check-in records anchor.",
)
assert.match(
  checkinCalendarSource,
  /id="checkin-records"/,
  "The check-in records card should expose a stable anchor target.",
)
assert.match(
  achievementsPageSource,
  /useSearchParams/,
  "The achievements page should handle hash/search navigation after client-side route changes.",
)
assert.match(
  achievementsPageSource,
  /scrollIntoView\(\{[\s\S]*block:\s*"start"/,
  "The achievements page should scroll the check-in records card into view when requested.",
)
assert.match(
  notificationDialogSource,
  /document\.getElementById\(targetId\)\?\.scrollIntoView\(\{[\s\S]*block:\s*"start"/,
  "The notification primary action should also scroll when the user is already on the target route.",
)

assert.doesNotMatch(
  notificationDialogSource,
  /handleDismiss|dismissing|提醒已忽略|忽略失败|>\s*忽略\s*</,
  "The notification detail dialog should not render a dismiss/ignore action.",
)
assert.doesNotMatch(
  notificationDialogSource,
  /onDismiss/,
  "The notification detail dialog should not accept an unused dismiss callback.",
)

console.log("User reminder and subscription UI details are guarded.")
