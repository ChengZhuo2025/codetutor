import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const roots = [
  ...readdirSync("features")
    .filter((entry) => entry.startsWith("admin-"))
    .map((entry) => join("features", entry)),
  "app/admin",
]
const sourceFilePattern = /\.(tsx|ts|jsx|js)$/
const searchButtonStartPattern = /<Button\b/g
const nativeSearchButtonPattern = /<button\b[\s\S]*?>[\s\S]*?搜索[\s\S]*?<\/button>/g

function collectFiles(root) {
  const files = []

  function walk(directory) {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry)
      const stat = statSync(path)

      if (stat.isDirectory()) {
        walk(path)
        continue
      }

      if (sourceFilePattern.test(path)) {
        files.push(path)
      }
    }
  }

  try {
    walk(root)
  } catch {
    // Some repositories may not have every scanned root, such as app/admin.
  }

  return files
}

const files = roots.flatMap(collectFiles)
const violations = []
let searchButtonCount = 0

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const displayPath = relative(process.cwd(), file)

  const nativeSearchButtonCount = (source.match(nativeSearchButtonPattern) ?? []).length

  if (nativeSearchButtonCount > 0) {
    violations.push(
      `${displayPath}: ${nativeSearchButtonCount} native <button> renders 搜索; use the global Button component`,
    )
  }

  for (const match of source.matchAll(searchButtonStartPattern)) {
    const segmentEnd = source.indexOf("</Button>", match.index)

    if (segmentEnd === -1) {
      continue
    }

    const segment = source.slice(match.index, segmentEnd)

    if (!segment.includes("搜索")) {
      continue
    }

    searchButtonCount += 1
    const beforeSearchText = segment.slice(0, segment.indexOf("搜索"))

    if (!/\bvariant=["']secondary["']/.test(beforeSearchText)) {
      violations.push(`${displayPath}: 搜索 Button must use variant="secondary"`)
    }
  }
}

assert.equal(
  violations.join("\n"),
  "",
  "Admin search buttons should use the global secondary Button style",
)

assert.ok(
  searchButtonCount > 0,
  "The admin search button check should find at least one Button labelled 搜索",
)
