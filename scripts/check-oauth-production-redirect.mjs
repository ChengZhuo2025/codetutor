import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const loginPageSource = readFileSync(
  new URL("../features/auth/pages/login-page.tsx", import.meta.url),
  "utf8",
)
const profileDialogSource = readFileSync(
  new URL("../components/layout/profile-edit-dialog.tsx", import.meta.url),
  "utf8",
)
const callbackSource = readFileSync(
  new URL("../app/auth/callback/page.tsx", import.meta.url),
  "utf8",
)
const oauthRedirectSource = readFileSync(
  new URL("../lib/auth/oauth-redirect.ts", import.meta.url),
  "utf8",
)

assert.match(
  oauthRedirectSource,
  /process\.env\.NEXT_PUBLIC_APP_URL/,
  "OAuth redirect helper should prefer the configured public app URL.",
)
assert.match(
  oauthRedirectSource,
  /window\.location\.origin/,
  "OAuth redirect helper may fall back to the current origin for local development.",
)
assert.match(
  loginPageSource,
  /buildOAuthRedirectTo\(/,
  "Login OAuth should build redirectTo through the shared production-safe helper.",
)
assert.doesNotMatch(
  loginPageSource,
  /window\.location\.origin\}\$\{ROUTES\.authCallback/,
  "Login OAuth should not hard-code callback redirects from the current window origin.",
)
assert.match(
  profileDialogSource,
  /buildOAuthRedirectTo\(/,
  "Profile identity linking should build redirectTo through the shared production-safe helper.",
)
assert.doesNotMatch(
  profileDialogSource,
  /window\.location\.origin\}\/auth\/callback/,
  "Profile identity linking should not hard-code callback redirects from the current window origin.",
)
assert.match(
  callbackSource,
  /isLocalhostOAuthTokenLeak\(/,
  "OAuth callback should detect localhost token-fragment fallback redirects.",
)
assert.match(
  callbackSource,
  /window\.location\.replace\(repairUrl\.toString\(\)\)/,
  "OAuth callback should repair localhost token-fragment redirects to the configured production origin.",
)

console.log("OAuth redirects use the production app URL and guard localhost token fallback.")
