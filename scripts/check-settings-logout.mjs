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
  /router\.push\(ROUTES\.home\)/,
  "SettingsPopover should redirect to ROUTES.home on logout",
)

console.log("Settings logout behavior redirects to home.")
