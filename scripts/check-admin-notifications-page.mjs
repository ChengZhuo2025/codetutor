import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const headerSource = readFileSync(
  new URL("../features/admin-shell/components/admin-header.tsx", import.meta.url),
  "utf8",
)

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

const pageSource = readFileSync(
  new URL("../app/(admin-shell)/admin/notifications/page.tsx", import.meta.url),
  "utf8",
)

const centerSource = readFileSync(
  new URL("../features/admin-notifications/components/admin-notification-center.tsx", import.meta.url),
  "utf8",
)

assert.match(headerSource, /AdminNotificationCenter/, "Admin header should render the real notification center trigger.")
assert.match(headerSource, /\/admin\/notifications/, "Admin header should expose the notifications route.")
assert.match(menuSource, /消息中心/, "Admin sidebar should expose the message center entry.")
assert.match(pageSource, /AdminNotificationList/, "Admin notifications page should render the list view.")
assert.match(centerSource, /SheetContent side="right"/, "Admin notification center should open as a right-side sheet.")
assert.match(centerSource, /查看全部/, "Admin notification center should provide a deep link to the full page.")
assert.match(centerSource, /\/admin\/notifications/, "Admin notification center should deep-link to the full page.")

console.log("Admin notifications page and entry points are wired.")
