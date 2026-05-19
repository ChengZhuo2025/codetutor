import { readFileSync } from "node:fs"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"

const root = fileURLToPath(new URL("..", import.meta.url))

const trackedFiles = execFileSync("rg", ["--files", "app", "components", "features"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))

const lowLevelFormFiles = new Set([
  "components/ui/checkbox.tsx",
  "components/ui/input.tsx",
  "components/ui/radio-group.tsx",
  "components/ui/select.tsx",
  "components/ui/simple-select.tsx",
  "components/ui/textarea.tsx",
])

const requiredUiFiles = [
  "components/ui/form-field.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/radio-group.tsx",
  "components/ui/simple-select.tsx",
]

function stripAllowedHiddenInputs(source) {
  return source.replace(/<input\b[^>]*(?:type=["'](?:hidden|file)["'][^>]*)\/?>/gs, "")
}

const violations = []

for (const file of trackedFiles) {
  const normalized = relative(root, fileURLToPath(new URL(file, `file://${root}/`)))
  if (lowLevelFormFiles.has(normalized)) {
    continue
  }

  const source = stripAllowedHiddenInputs(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"))
  const rawInput = source.match(/<input\b(?![^>]*type=["'](?:hidden|file)["'])/g)
  const rawSelect = source.match(/<select\b/g)
  const rawTextarea = source.match(/<textarea\b/g)
  const rawCheckboxOrRadio = source.match(/<input\b[^>]*type=["'](?:checkbox|radio)["']/g)

  if (rawInput?.length) {
    violations.push(`${file}: raw visible <input> (${rawInput.length})`)
  }
  if (rawSelect?.length) {
    violations.push(`${file}: raw <select> (${rawSelect.length})`)
  }
  if (rawTextarea?.length) {
    violations.push(`${file}: raw <textarea> (${rawTextarea.length})`)
  }
  if (rawCheckboxOrRadio?.length) {
    violations.push(`${file}: raw checkbox/radio input (${rawCheckboxOrRadio.length})`)
  }
}

for (const file of requiredUiFiles) {
  assert.ok(trackedFiles.includes(file), `${file} must exist as a global form primitive`)
}

assert.deepEqual(violations, [], `Visible form controls must use components/ui primitives:\n${violations.join("\n")}`)

console.log("Visible form controls use the shared components/ui form primitives.")
