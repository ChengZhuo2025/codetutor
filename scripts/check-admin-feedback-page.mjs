import fs from "node:fs"
import assert from "node:assert/strict"

const detailSource = fs.readFileSync("features/admin-feedback/components/feedback-detail.tsx", "utf8")

assert.match(
  detailSource,
  /feedbackStatusPillClassNames:\s*Record<FeedbackStatus,\s*string>/,
  "Feedback detail should define status-specific pill classes.",
)

assert.match(
  detailSource,
  /replied:\s*"[^"]*emerald[^"]*"/,
  "The resolved feedback status pill should use the emerald success palette.",
)

assert.match(
  detailSource,
  /feedbackStatusPillClassNames\[data\.status\]/,
  "The title status pill should use feedback status, not priority, to choose color.",
)

assert.match(
  detailSource,
  /href=\{`\$\{ADMIN_ROUTES\.users\}\/\$\{data\.userId\}`\}/,
  "The user snapshot detail action should navigate to the admin user detail page.",
)
