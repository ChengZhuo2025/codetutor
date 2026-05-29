import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const source = readFileSync("supabase/migrations/057_create_site_changelog.sql", "utf8")

assert.match(source, /site_changelog_entries/)
assert.match(source, /status IN \('draft', 'published', 'archived'\)/)
assert.match(source, /source_commits_json/)
assert.match(source, /llm_invocation_id/)
assert.match(source, /uidx_site_changelog_entries_log_date_active/)
assert.match(source, /CREATE EXTENSION IF NOT EXISTS pg_trgm/)
assert.match(source, /idx_site_changelog_entries_title_trgm/)
assert.match(source, /idx_site_changelog_entries_summary_trgm/)
assert.match(source, /update_updated_at\(\)/)
assert.match(source, /ENABLE ROW LEVEL SECURITY/)
assert.match(source, /Public can read published site changelog/)
assert.match(source, /Active admins can insert site changelog/)

console.log("site changelog schema assertions passed")
