import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const files = {
  dialog: readFileSync("components/ui/dialog.tsx", "utf8"),
  notificationSettings: readFileSync("components/layout/notification-settings-dialog.tsx", "utf8"),
  subscriptionDetail: readFileSync("components/layout/subscription-detail-dialog.tsx", "utf8"),
  feedback: readFileSync("components/layout/feedback-dialog.tsx", "utf8"),
  historyReview: readFileSync("features/history/components/history-review-dialog.tsx", "utf8"),
  profileEdit: readFileSync("components/layout/profile-edit-dialog.tsx", "utf8"),
}

assert.match(
  files.dialog,
  /size-9[\s\S]*sm:size-auto|min-h-10[\s\S]*min-w-10/,
  "Dialog close button should have a mobile-friendly touch target.",
)

assert.match(
  files.notificationSettings,
  /grid grid-cols-2 gap-2[\s\S]*sm:flex[\s\S]*sm:pl-\[52px\]/,
  "Notification quiet-hours controls should wrap into a compact mobile grid.",
)
assert.match(
  files.notificationSettings,
  /w-full[\s\S]*sm:w-28/,
  "Notification TimePicker controls should use full mobile width before fixed desktop width.",
)

assert.match(
  files.subscriptionDetail,
  /grid gap-2[\s\S]*sm:flex[\s\S]*sm:justify-center[\s\S]*sm:gap-8/,
  "Subscription footer hints should stack on mobile and only use the desktop row layout at sm.",
)
assert.match(
  files.subscriptionDetail,
  /size-\[min\(62vw,248px\)\][\s\S]*max-w-full/,
  "Subscription payment QR should use a viewport-bound responsive size.",
)

assert.match(
  files.feedback,
  /max-h-\[34vh\][\s\S]*sm:max-h-\[56vh\]/,
  "Feedback mobile ticket list should not reserve a desktop-height panel.",
)
assert.match(
  files.feedback,
  /min-h-0[\s\S]*sm:min-h-\[56vh\]/,
  "Feedback detail panel should only reserve desktop min-height from sm upward.",
)

assert.match(
  files.historyReview,
  /flex flex-col[\s\S]*sm:flex-row[\s\S]*sm:justify-between/,
  "History review step rows should stack status below the title on mobile.",
)
assert.match(
  files.historyReview,
  /self-start[\s\S]*sm:text-right/,
  "History review status block should align naturally on mobile and right-align on desktop.",
)

assert.match(
  files.profileEdit,
  /min-h-10[\s\S]*px-4[\s\S]*sm:h-8/,
  "Profile OAuth binding buttons should keep a larger mobile touch target.",
)

console.log("User dialog mobile styling checks passed.")
