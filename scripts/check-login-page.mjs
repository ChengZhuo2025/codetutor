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
assert.match(
  loginFormSource,
  /shouldShowOAuthLoginMethods\s*=\s*mode === "login"/,
  "Login form should only render OAuth scan entries in login mode.",
)
assert.match(
  loginFormSource,
  /shouldShowOAuthLoginMethods \? \(/,
  "Login form should hide the other-login-methods section when the register tab is active.",
)
assert.match(
  loginFormSource,
  /phoneValidationMessage/,
  "Login form should derive an inline phone validation hint instead of silently disabling send-code.",
)
assert.match(
  loginFormSource,
  /请输入 11 位中国大陆手机号|请输入真实的 11 位中国大陆手机号/,
  "Login form should explain what is wrong with the current phone input.",
)
assert.match(
  loginFormSource,
  /border-destructive\/60|text-destructive/,
  "Login form should visually distinguish an invalid completed phone number.",
)
assert.match(oauthProvidersSource, /微信扫码/, "OAuth provider config should expose the WeChat scan entry.")
assert.match(oauthProvidersSource, /抖音扫码/, "OAuth provider config should expose the Douyin scan entry.")
assert.match(
  loginPageSource,
  /useAppToast/,
  "Login page should use the shared app toast for OAuth error feedback.",
)
assert.match(
  loginPageSource,
  /toast\.error\(/,
  "Login page should surface OAuth errors through the shared toast system.",
)
assert.doesNotMatch(
  loginPageSource,
  /loadOAuthProviderAvailability|oauthAvailability|external_wechat_enabled|external_douyin_enabled/,
  "Login page should not perform separate OAuth provider availability checks now that both scan providers are enabled.",
)
assert.doesNotMatch(
  loginFormSource,
  /检测中"|可用"|待开通"|badgeLabel|oauthAvailability/,
  "OAuth scan entries should not render provider availability status badges.",
)
assert.match(
  loginPageSource,
  /signInWithOAuth/,
  "Login page should obtain OAuth authorization URLs through Supabase JS instead of hand-written authorize requests.",
)
assert.doesNotMatch(
  loginPageSource,
  /window\.open\(\s*data\.url/,
  "Login page should not open OAuth authorization URLs in a separate popup before showing the scan dialog.",
)
assert.match(
  loginFormSource,
  /<iframe/,
  "OAuth scan dialog should render the provider authorization page inline instead of only pointing to a separate popup.",
)
assert.match(
  loginFormSource,
  /正在加载二维码|isFrameLoading|onLoad=\{\(\) => setLoadedFrameId/,
  "OAuth scan dialog should show a loading state while the embedded authorization page loads.",
)
assert.doesNotMatch(
  loginPageSource,
  /\/auth\/v1\/authorize/,
  "Login page should not POST to GoTrue authorize; the hosted OAuth authorize endpoint is browser-navigation based.",
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
  /oauthStatus:\s*"empty"\s*\|\s*"loading"\s*\|\s*"error"/,
  "Login form should not own inline OAuth status state once OAuth feedback uses the global toast.",
)
assert.doesNotMatch(
  loginFormSource,
  /oauthStatusTitle|oauthStatusMessage/,
  "Login form should not render inline OAuth title/message props after switching to the global toast.",
)
assert.doesNotMatch(
  loginFormSource,
  /showOauthState/,
  "Login form should no longer render the inline OAuth state panel.",
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
assert.match(
  callbackSource,
  /codetutor\.oauth\.binding_required/,
  "Auth callback should notify the login page when an OAuth identity needs phone binding.",
)
assert.match(
  callbackSource,
  /codetutor\.oauth\.linked/,
  "Auth callback should notify the opener after identity linking completes.",
)
assert.match(
  loginPageSource,
  /pendingBindProvider/,
  "Login page should keep track of an OAuth provider waiting for phone binding.",
)
assert.match(
  loginPageSource,
  /\/auth\/phone-status\?phone=/,
  "Login page should check whether a completed login phone has already registered.",
)
assert.match(
  loginPageSource,
  /当前手机号未注册，请先注册/,
  "Login page should explain when a completed login phone is not registered.",
)
assert.match(
  loginPageSource,
  /setMode\("register"\)/,
  "Login page should switch to the register tab when the login phone is not registered.",
)
assert.match(
  loginPageSource,
  /linkIdentity/,
  "Login page should trigger Supabase manual identity linking after phone verification.",
)
assert.match(
  loginPageSource,
  /flow", "link"|flow: "link"|flow=link/,
  "Login page should use a dedicated link callback flow for manual identity linking.",
)

console.log("Login page keeps a stable phone-first layout with OAuth scan entries.")
