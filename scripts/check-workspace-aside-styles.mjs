import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const sharedFile = "components/layout/workspace-aside.tsx"
const sharedSource = readFileSync(new URL(`../${sharedFile}`, import.meta.url), "utf8")

for (const symbol of [
  "WorkspaceAside",
  "WORKSPACE_ASIDE_CARD_CLASS",
  "WORKSPACE_ASIDE_BRAND_CARD_CLASS",
  "WORKSPACE_ASIDE_GOLD_CARD_CLASS",
  "WORKSPACE_ASIDE_INSET_CARD_CLASS",
]) {
  assert.match(
    sharedSource,
    new RegExp(`export\\s+(const|function)\\s+${symbol}\\b`),
    `${sharedFile} should export ${symbol}`,
  )
}

const learnSource = readFileSync(
  new URL("../features/learning/components/right-panel.tsx", import.meta.url),
  "utf8",
)
assert.match(
  learnSource,
  /import\s+\{[\s\S]*WORKSPACE_ASIDE_CARD_CLASS[\s\S]*WORKSPACE_ASIDE_INSET_CARD_CLASS[\s\S]*WorkspaceAside[\s\S]*\}\s+from\s+"@\/components\/layout\/workspace-aside"/,
  "LearnRightPanel should use shared workspace aside styles",
)
assert.match(learnSource, /<WorkspaceAside/, "LearnRightPanel should render WorkspaceAside")
assert.doesNotMatch(
  learnSource,
  /卡住时先这样做|技巧小贴士/,
  "LearnRightPanel should remove the distracting stuck-tip card",
)
assert.match(
  learnSource,
  /eyebrow="你现在学到哪了"[\s\S]*title="当前任务进行到哪一步"[\s\S]*description="当前学习计划依序展示：勾选为已完成，「进行中」为当前；全路径点「查看全部」。"/,
  "LearnRightPanel should use learner-friendly wording for the current path card",
)
assert.match(
  learnSource,
  /eyebrow="你现在学到哪了"[\s\S]*eyebrow="现在只做这一步"/,
  "LearnRightPanel should place the current path card above the current-step card",
)

const mapSource = readFileSync(
  new URL("../features/progress/components/stage-detail-panel.tsx", import.meta.url),
  "utf8",
)
assert.match(
  mapSource,
  /import\s+\{[\s\S]*WORKSPACE_ASIDE_INSET_CARD_CLASS[\s\S]*WorkspaceAside[\s\S]*\}\s+from\s+"@\/components\/layout\/workspace-aside"/,
  "StageDetailPanel should use shared workspace aside styles",
)
assert.match(mapSource, /<WorkspaceAside/, "StageDetailPanel should render WorkspaceAside")

const achievementSource = readFileSync(
  new URL("../features/achievement/components/achievement-sidebar-panels.tsx", import.meta.url),
  "utf8",
)
assert.match(
  achievementSource,
  /import\s+\{\s*WorkspaceAside\s*\}\s+from\s+"@\/components\/layout\/workspace-aside"/,
  "AchievementSidebarPanels should use WorkspaceAside",
)
assert.match(
  achievementSource,
  /<WorkspaceAside/,
  "AchievementSidebarPanels should render WorkspaceAside",
)

console.log("Workspace aside styles are shared across right-side panels.")
