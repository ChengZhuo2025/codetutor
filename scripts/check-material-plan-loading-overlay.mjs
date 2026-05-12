import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const dialogSource = read("features/learning/components/material-plan-dialog.tsx")
const panelSource = read("features/learning/components/material-plan-panel.tsx")

assert.match(
  dialogSource,
  /isGeneratingPlan/,
  "material plan dialog should track whether async plan generation is active",
)

assert.match(
  dialogSource,
  /showCloseButton=\{!isGeneratingPlan\}/,
  "material plan dialog should hide the close button while generation is active",
)

assert.match(
  dialogSource,
  /if \(!next && isGeneratingPlan\)/,
  "material plan dialog should block close requests while generation is active",
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
  panelSource,
  /正在生成学习计划/,
  "material plan panel should render the foreground loading overlay copy",
)

assert.match(
  panelSource,
  /aria-busy=\{isGeneratingPlan\}/,
  "material plan panel should expose busy state for the loading overlay",
)

console.log("Material plan loading overlay contracts are present.")
