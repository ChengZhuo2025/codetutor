import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const dialogSource = read("features/learning/components/material-plan-dialog.tsx")
const panelSource = read("features/learning/components/material-plan-panel.tsx")
const loaderSource = read("features/learning/components/material-plan-generation-loader.tsx")

assert.match(
  dialogSource,
  /onGeneratingChange=\{setIsGeneratingPlan\}/,
  "material plan dialog should still receive async generation state from the panel",
)

assert.match(
  dialogSource,
  /showCloseButton/,
  "material plan dialog should keep the close button available while generation is recoverable",
)

assert.doesNotMatch(
  dialogSource,
  /if \(!next && isGeneratingPlan\)/,
  "material plan dialog should not block close requests while generation can be restored",
)

assert.match(
  panelSource,
  /onGeneratingChange/,
  "material plan panel should report generation state to the dialog",
)

assert.match(
  panelSource,
  /displayProgressPercent/,
  "material plan panel should render a locally smoothed display progress value",
)

assert.match(
  panelSource,
  /Math\.min\(9[25],/,
  "material plan panel should cap local progress before the backend marks generation ready",
)

assert.match(
  loaderSource,
  /回到学习工作台后会自动恢复进度/,
  "material plan loader should explain that async generation can be restored after closing",
)

assert.match(
  loaderSource,
  /sticky top-4/,
  "material plan loading surface should stay visible within the dialog scroll viewport",
)

assert.match(
  panelSource,
  /aria-busy=\{isGeneratingPlan\}/,
  "material plan panel should expose busy state for the loading overlay",
)

assert.match(
  panelSource,
  /MaterialPlanGenerationLoader/,
  "material plan panel should delegate the generation overlay body to the OpenMAIC-style loader",
)

assert.match(
  loaderSource,
  /OpenMAIC/,
  "material plan generation loader should document the OpenMAIC interaction it adapts",
)

assert.match(
  loaderSource,
  /解析教程内容/,
  "material plan generation loader should show the material extraction milestone",
)

assert.match(
  loaderSource,
  /拆解学习路径/,
  "material plan generation loader should show the planning milestone",
)

assert.match(
  loaderSource,
  /校验计划质量/,
  "material plan generation loader should show the quality gate milestone",
)

assert.doesNotMatch(
  loaderSource,
  /material-plan-orbit-card/,
  "material plan generation loader should avoid a nested orbit card inside the modal overlay",
)

assert.match(
  loaderSource,
  /material-plan-step-dot/,
  "material plan generation loader should include stage progress dots",
)

assert.match(
  loaderSource,
  /material-plan-visual-object/,
  "material plan generation loader should keep the central OpenMAIC-style visual as an unframed object",
)

assert.match(
  loaderSource,
  /border-b border-border\/50/,
  "material plan generation milestones should be a flat step list with separators, not nested cards",
)

assert.doesNotMatch(
  loaderSource,
  /rounded-xl border px-3 py-3/,
  "material plan generation milestones should not render as individual nested cards",
)

assert.doesNotMatch(
  loaderSource,
  /material-plan-orbit-ring/,
  "material plan generation loader should reduce motion density by removing orbit ring animations",
)

assert.doesNotMatch(
  loaderSource,
  /material-plan-step-dot-pulse/,
  "material plan generation loader should reduce motion density by removing step dot pulse animation",
)

console.log("Material plan loading overlay contracts are present.")
