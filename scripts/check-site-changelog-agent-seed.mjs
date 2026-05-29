import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const source = readFileSync("supabase/seeds/009_site_changelog_writer_agent.sql", "utf8")

assert.match(source, /site-changelog-writer/)
assert.match(source, /deepseek-v4-pro/)
assert.match(source, /hash|哈希|commit/i)
assert.match(source, /分支/)
assert.match(source, /邮箱/)
assert.match(source, /"summaryMarkdown"/)
assert.match(source, /JSON/)

console.log("site changelog agent seed assertions passed")
