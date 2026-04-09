import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const surfaceStylesSource = readFileSync(
  new URL("../components/ui/surface-styles.ts", import.meta.url),
  "utf8",
)

const sourceByFile = new Map([
  [
    "components/layout/notification-settings-dialog.tsx",
    readFileSync(new URL("../components/layout/notification-settings-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/layout/profile-edit-dialog.tsx",
    readFileSync(new URL("../components/layout/profile-edit-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/layout/feedback-dialog.tsx",
    readFileSync(new URL("../components/layout/feedback-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/layout/notification-detail-dialog.tsx",
    readFileSync(new URL("../components/layout/notification-detail-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/layout/subscription-detail-dialog.tsx",
    readFileSync(new URL("../components/layout/subscription-detail-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/layout/settings-popover.tsx",
    readFileSync(new URL("../components/layout/settings-popover.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/ui/time-picker.tsx",
    readFileSync(new URL("../components/ui/time-picker.tsx", import.meta.url), "utf8"),
  ],
  [
    "components/ui/switch.tsx",
    readFileSync(new URL("../components/ui/switch.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/learning/components/material-plan-dialog.tsx",
    readFileSync(new URL("../features/learning/components/material-plan-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/learning/components/chat.tsx",
    readFileSync(new URL("../features/learning/components/chat.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/history/components/history-review-dialog.tsx",
    readFileSync(new URL("../features/history/components/history-review-dialog.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/history/components/history-card.tsx",
    readFileSync(new URL("../features/history/components/history-card.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/history/pages/history-page.tsx",
    readFileSync(new URL("../features/history/pages/history-page.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/history/components/history-list.tsx",
    readFileSync(new URL("../features/history/components/history-list.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/onboarding/components/tool-selection-step.tsx",
    readFileSync(new URL("../features/onboarding/components/tool-selection-step.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/onboarding/components/level-selection-step.tsx",
    readFileSync(new URL("../features/onboarding/components/level-selection-step.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/onboarding/components/path-selection-step.tsx",
    readFileSync(new URL("../features/onboarding/components/path-selection-step.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/onboarding/components/onboarding-header.tsx",
    readFileSync(new URL("../features/onboarding/components/onboarding-header.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/progress/components/map-header.tsx",
    readFileSync(new URL("../features/progress/components/map-header.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/progress/components/progress-overview.tsx",
    readFileSync(new URL("../features/progress/components/progress-overview.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/progress/components/stage-timeline.tsx",
    readFileSync(new URL("../features/progress/components/stage-timeline.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/progress/components/stage-detail-panel.tsx",
    readFileSync(new URL("../features/progress/components/stage-detail-panel.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/achievement/pages/achievements-page.tsx",
    readFileSync(new URL("../features/achievement/pages/achievements-page.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/achievement/components/achievement-stats-grid.tsx",
    readFileSync(new URL("../features/achievement/components/achievement-stats-grid.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/achievement/components/badge-grid.tsx",
    readFileSync(new URL("../features/achievement/components/badge-grid.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/achievement/components/checkin-calendar.tsx",
    readFileSync(new URL("../features/achievement/components/checkin-calendar.tsx", import.meta.url), "utf8"),
  ],
  [
    "features/achievement/components/achievement-sidebar-panels.tsx",
    readFileSync(new URL("../features/achievement/components/achievement-sidebar-panels.tsx", import.meta.url), "utf8"),
  ],
])

assert.match(
  surfaceStylesSource,
  /export const DIALOG_PANEL_CLASS =/,
  "Surface styles should export a shared cross-theme dialog panel class",
)

assert.match(
  surfaceStylesSource,
  /export const DIALOG_GRADIENT_PANEL_CLASS =/,
  "Surface styles should export a shared cross-theme gradient dialog panel class",
)

assert.match(
  surfaceStylesSource,
  /export const FLOATING_PANEL_CLASS =/,
  "Surface styles should export a shared cross-theme floating panel class",
)

for (const filePath of [
  "components/layout/notification-settings-dialog.tsx",
  "components/layout/profile-edit-dialog.tsx",
  "components/layout/feedback-dialog.tsx",
  "components/layout/notification-detail-dialog.tsx",
  "features/learning/components/material-plan-dialog.tsx",
  "features/learning/components/chat.tsx",
  "features/history/components/history-review-dialog.tsx",
]) {
  assert.match(
    sourceByFile.get(filePath),
    /DIALOG_PANEL_CLASS/,
    `${filePath} should use the shared cross-theme dialog panel class`,
  )
}

for (const filePath of [
  "components/layout/subscription-detail-dialog.tsx",
]) {
  assert.match(
    sourceByFile.get(filePath),
    /DIALOG_GRADIENT_PANEL_CLASS/,
    `${filePath} should use the shared cross-theme gradient dialog panel class`,
  )
}

for (const filePath of [
  "components/layout/settings-popover.tsx",
  "components/ui/time-picker.tsx",
]) {
  assert.match(
    sourceByFile.get(filePath),
    /FLOATING_PANEL_CLASS/,
    `${filePath} should use the shared cross-theme floating panel class`,
  )
}

for (const filePath of [
  "features/onboarding/components/tool-selection-step.tsx",
  "features/onboarding/components/level-selection-step.tsx",
  "features/onboarding/components/path-selection-step.tsx",
  "features/onboarding/components/onboarding-header.tsx",
  "features/history/components/history-card.tsx",
  "features/history/components/history-list.tsx",
  "features/history/pages/history-page.tsx",
  "features/progress/components/map-header.tsx",
  "features/progress/components/progress-overview.tsx",
  "features/progress/components/stage-timeline.tsx",
  "features/progress/components/stage-detail-panel.tsx",
  "features/achievement/pages/achievements-page.tsx",
  "features/achievement/components/achievement-stats-grid.tsx",
  "features/achievement/components/badge-grid.tsx",
  "features/achievement/components/checkin-calendar.tsx",
  "features/achievement/components/achievement-sidebar-panels.tsx",
]) {
  assert.doesNotMatch(
    sourceByFile.get(filePath),
    /(?<!dark:)(?<!dark:hover:)bg-background\/(?:\[[^\]]+\]|\d+)/,
    `${filePath} should avoid thin light-theme background washes in user-facing surfaces`,
  )
}

const forbiddenPatterns = [
  {
    label: "plain white translucent background outside dark mode",
    regex: /(?<!dark:)(?<!dark:hover:)bg-white\/(?:\[[^\]]+\]|\d+)/,
  },
  {
    label: "plain white translucent border outside dark mode",
    regex: /(?<!dark:)(?<!dark:hover:)border-white\/(?:\[[^\]]+\]|\d+)/,
  },
  {
    label: "plain white translucent ring outside dark mode",
    regex: /(?<!dark:)(?<!dark:hover:)ring-white\/(?:\[[^\]]+\]|\d+)/,
  },
  {
    label: "plain white translucent divider outside dark mode",
    regex: /(?<!dark:)(?<!dark:hover:)divide-white\/(?:\[[^\]]+\]|\d+)/,
  },
  {
    label: "plain white hover wash outside dark mode",
    regex: /(?<!dark:)hover:bg-white\/(?:\[[^\]]+\]|\d+)/,
  },
]

for (const [filePath, source] of sourceByFile) {
  for (const { label, regex } of forbiddenPatterns) {
    assert.doesNotMatch(
      source,
      regex,
      `${filePath} should not use ${label} in user-facing cross-theme surfaces`,
    )
  }
}

console.log("User-facing theme surfaces use shared cross-theme classes and avoid light-theme white-wash regressions.")
