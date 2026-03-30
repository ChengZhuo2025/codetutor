import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const file = "components/layout/settings-popover.tsx"
const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

assert.match(
  source,
  /import\s+\{\s*useRouter\s*\}\s+from\s+"next\/navigation"/,
  "SettingsPopover should import useRouter",
)

assert.match(
  source,
  /const\s+router\s*=\s*useRouter\(\)/,
  "SettingsPopover should create a router instance",
)

assert.match(
  source,
  /createSupabaseBrowserClient/,
  "SettingsPopover should create a Supabase browser client for logout",
)

assert.match(
  source,
  /supabase\.auth\.signOut\(\)/,
  "SettingsPopover should clear the Supabase session on logout",
)

assert.match(
  source,
  /router\.(push|replace)\(ROUTES\.home\)/,
  "SettingsPopover should redirect to ROUTES.home after logout",
)

console.log("Settings logout behavior signs out Supabase session and redirects home.")
