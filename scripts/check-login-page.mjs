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
const bindingRequiredBranchStart = loginPageSource.indexOf(
  'event.data.type === "codetutor.oauth.binding_required"',
)
const bindingRequiredBranchEnd = loginPageSource.indexOf(
  'if (event.data.type === "codetutor.oauth.linked")',
  bindingRequiredBranchStart,
)
assert.notEqual(
  bindingRequiredBranchStart,
  -1,
  "Login page should handle the OAuth phone-binding-required message.",
)
assert.notEqual(
  bindingRequiredBranchEnd,
  -1,
  "Login page should keep the OAuth linked branch after the binding-required branch.",
)
const bindingRequiredBranchSource = loginPageSource.slice(
  bindingRequiredBranchStart,
  bindingRequiredBranchEnd,
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
  /isOAuthBinding\s*=\s*step === "oauth-binding"/,
  "Login form should track the OAuth phone-binding step explicitly.",
)
assert.match(
  loginFormSource,
  /feedbackStatus\s*=\s*[^;]*isOAuthBinding[\s\S]*\?\s*"warning"[\s\S]*:\s*"error"/,
  "OAuth phone binding should render its guidance as a warning instead of an error.",
)
assert.match(
  loginFormSource,
  /title=\{feedbackStatus === "warning" \? "需要绑定手机号" : "操作失败"\}/,
  "OAuth phone binding should not label the expected binding step as an operation failure.",
)
assert.match(
  loginFormSource,
  /!isOAuthBinding \? \(/,
  "Login form should hide the other-login-methods section while an OAuth account is binding a phone.",
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
assert.match(
  loginPageSource,
  /openOAuthPopup\(/,
  "Login page should open hosted OAuth authorization in a real popup window instead of embedding provider pages.",
)
assert.doesNotMatch(
  loginFormSource,
  /<iframe/,
  "OAuth login should not iframe hosted provider pages because WeChat authorization blocks cross-origin iframe completion.",
)
assert.doesNotMatch(
  loginFormSource,
  /OAuthScanDialog|等待授权完成|等待扫码确认|重新打开授权窗口|新窗口打开/,
  "Login form should not render a custom OAuth waiting dialog now that the official provider popup is the only scan UI.",
)
assert.doesNotMatch(
  loginPageSource,
  /oauthDialog|setOauthDialog|onOAuthWindowOpen|onOAuthDialogOpenChange/,
  "Login page should not maintain custom OAuth dialog state after opening the official provider popup.",
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
  "Login page should clear the local Supabase session when restoring a stale browser session or finalizing app login fails.",
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
  callbackSource,
  /notifyParentOAuthLinked\(provider\)[\s\S]*setStatus\("success"\)[\s\S]*closeOpenedOAuthWindow\(\)/,
  "Auth callback should show completion and close the popup after identity linking succeeds.",
)
assert.match(
  loginPageSource,
  /pendingBindProvider/,
  "Login page should keep track of an OAuth provider waiting for phone binding.",
)
assert.match(
  loginPageSource,
  /验证码请求已提交至/,
  "Login page should not imply Supabase OTP 200 means the SMS has definitely been delivered.",
)
assert.match(
  bindingRequiredBranchSource,
  /clearBrowserAuthSession\(\)/,
  "OAuth phone binding should clear the transient OAuth session in the parent login page before phone OTP starts.",
)
assert.match(
  loginPageSource,
  /if \(pendingBindProvider\)[\s\S]*clearBrowserAuthSession\(\)[\s\S]*signInWithOtp/,
  "OAuth phone binding should send the phone OTP only after clearing any stale OAuth session state.",
)
assert.doesNotMatch(
  loginPageSource,
  /\/auth\/phone-status\?phone=|当前手机号未注册，请先注册|setMode\("register"\)/,
  "Login page should no longer branch into a separate register tab now that phone login creates users when needed.",
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
assert.match(
  callbackSource,
  /isApiError\(error\).*OAUTH_PHONE_BINDING_REQUIRED/s,
  "Auth callback should branch on structured API error codes for phone binding.",
)
assert.match(
  callbackSource,
  /requestData\("\/auth\/oauth-temp-user\/discard"[\s\S]*\.catch\(\(\) => undefined\)[\s\S]*supabase\.auth\.signOut\(\{ scope: "local" \}\)/,
  "Auth callback should always clear the popup's local OAuth session before notifying the login page to bind a phone.",
)
assert.match(
  callbackSource,
  /getSafeInternalRedirectTo\(searchParams\.get\("redirectTo"\)\)/,
  "Auth callback should preserve a safe intended redirect after standalone identity-link callbacks.",
)

console.log("Login page keeps a stable phone-first layout with OAuth scan entries.")
