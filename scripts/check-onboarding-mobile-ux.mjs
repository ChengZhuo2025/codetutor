import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const pageSource = source("features/onboarding/pages/onboarding-page.tsx")
const toolStepSource = source("features/onboarding/components/tool-selection-step.tsx")
const levelStepSource = source("features/onboarding/components/level-selection-step.tsx")
const pathStepSource = source("features/onboarding/components/path-selection-step.tsx")

for (const [name, stepSource] of [
  ["ToolSelectionStep", toolStepSource],
  ["LevelSelectionStep", levelStepSource],
  ["PathSelectionStep", pathStepSource],
]) {
  assert.match(
    stepSource,
    /isActive: boolean/,
    `${name} should receive active-step state so inactive panels can be hidden on mobile.`,
  )

  assert.match(
    stepSource,
    /aria-hidden=\{!isActive\}/,
    `${name} should hide inactive panels from assistive technology.`,
  )

  assert.match(
    stepSource,
    /inert=\{!isActive \? true : undefined\}/,
    `${name} should remove inactive panels from the interaction tree.`,
  )

  assert.match(
    stepSource,
    /!isActive && "hidden md:block"/,
    `${name} should render only the active step in the mobile visual flow.`,
  )

  assert.match(
    stepSource,
    /fixed inset-x-0 bottom-0[\s\S]+md:static/,
    `${name} should keep the primary action reachable with a mobile sticky action bar.`,
  )
}

assert.match(
  pageSource,
  /md:\[transform:translateX\(var\(--onboarding-step-offset\)\)\]/,
  "Onboarding page should keep the horizontal step slider desktop-only.",
)

assert.match(
  pageSource,
  /isActive=\{step === 1\}[\s\S]+isActive=\{step === 2\}[\s\S]+isActive=\{step === 3\}/,
  "Onboarding page should pass active-step state to all step panels.",
)

assert.match(
  toolStepSource,
  /line-clamp-1[\s\S]+md:line-clamp-2/,
  "Tool cards should reduce description density on mobile while preserving desktop detail.",
)

assert.match(
  pathStepSource,
  /mx-auto w-full max-w-3xl md:h-\[min\(46vh,28rem\)\] md:overflow-hidden/,
  "Path choices should use normal page scrolling on mobile and constrained scrolling only on desktop.",
)

assert.doesNotMatch(
  pathStepSource,
  /className="mx-auto h-\[min\(46vh,28rem\)\]/,
  "Path choices should not force a 46vh internal scroller on mobile.",
)

assert.match(
  pathStepSource,
  /path\.tags\.slice\(0, 2\)/,
  "Path cards should cap visible mobile tags to keep route cards scannable.",
)

console.log("Onboarding mobile UX checks passed.")
