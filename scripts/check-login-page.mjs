import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const loginFormSource = readFileSync(
  new URL("../features/auth/components/login-form.tsx", import.meta.url),
  "utf8",
)
const loginPageSource = readFileSync(
  new URL("../features/auth/pages/login-page.tsx", import.meta.url),
  "utf8",
)
const loginBrandPanelSource = readFileSync(
  new URL("../features/auth/components/login-brand-panel.tsx", import.meta.url),
  "utf8",
)
const oauthProvidersSource = readFileSync(
  new URL("../features/auth/lib/oauth-providers.tsx", import.meta.url),
  "utf8",
)
const callbackSource = readFileSync(
  new URL("../app/auth/callback/page.tsx", import.meta.url),
  "utf8",
)
const globalsSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
)

assert.doesNotMatch(
  loginFormSource,
  /role="tablist"/,
  "Login form should no longer render auth tabs.",
)

assert.doesNotMatch(
  loginFormSource,
  /本地测试验证码/,
  "Login form should not expose local test OTP messaging in the production-oriented layout.",
)

assert.match(
  loginFormSource,
  /OAUTH_PROVIDERS\.map/,
  "Login form should render OAuth scan entries from the shared provider config.",
)
assert.match(oauthProvidersSource, /微信扫码/, "OAuth provider config should expose the WeChat scan entry.")
assert.match(oauthProvidersSource, /抖音扫码/, "OAuth provider config should expose the Douyin scan entry.")
assert.match(
  loginPageSource,
  /loadOAuthProviderAvailability/,
  "Login page should load OAuth provider availability for stable login actions.",
)

assert.match(
  loginPageSource,
  /ThemeToggle/,
  "Login page should expose the shared theme toggle in the top corner.",
)
assert.match(
  loginPageSource,
  /signOut\(\{ scope: "local" \}\)/,
  "Login page should clear the local Supabase session when restoring a stale browser session fails.",
)
assert.match(
  loginFormSource,
  /DialogContent/,
  "Login form should expose real agreement entry points instead of non-functional text spans.",
)
assert.doesNotMatch(
  loginFormSource,
  /disabled=\{isChecking \|\| !available \|\| isActive \|\| isSubmitting\}/,
  "OAuth entry should stay reachable even when a provider is not yet enabled so the user can see the explanation.",
)
assert.doesNotMatch(
  loginBrandPanelSource,
  /<h1/,
  "Brand panel should not introduce a second H1 on the desktop login layout.",
)
assert.doesNotMatch(
  globalsSource,
  /html\s*\{[^}]*scroll-behavior:\s*smooth;/s,
  "Global html smooth scrolling should not be forced because it creates Next.js route transition warnings.",
)
assert.match(
  callbackSource,
  /loginType: provider/,
  "Auth callback should map the OAuth provider to the shared auth login payload.",
)

console.log("Login page keeps a stable phone-first layout with OAuth scan entries.")
