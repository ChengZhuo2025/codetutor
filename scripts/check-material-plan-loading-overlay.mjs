import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const dialogSource = read("features/learning/components/material-plan-dialog.tsx")
const panelSource = read("features/learning/components/material-plan-panel.tsx")

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
  panelSource,
  /回到学习工作台后会自动恢复进度/,
  "material plan panel should explain that async generation can be restored after closing",
)

assert.match(
  panelSource,
  /sticky top-4/,
  "material plan loading card should stay visible within the dialog scroll viewport",
)

assert.match(
  panelSource,
  /aria-busy=\{isGeneratingPlan\}/,
  "material plan panel should expose busy state for the loading overlay",
)

console.log("Material plan loading overlay contracts are present.")
