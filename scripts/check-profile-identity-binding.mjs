import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const source = readFileSync(
  new URL("../components/layout/profile-edit-dialog.tsx", import.meta.url),
  "utf8",
)

assert.match(
  source,
  /getUserIdentities/,
  "Profile dialog should load Supabase identities for binding status.",
)

assert.match(
  source,
  /linkIdentity/,
  "Profile dialog should use Supabase manual identity linking.",
)

assert.match(
  source,
  /登录方式/,
  "Profile dialog should render a login-methods section.",
)

assert.match(
  source,
  /codetutor\.oauth\.linked/,
  "Profile dialog should react to OAuth link callback messages.",
)

assert.match(
  source,
  /openOAuthLinkPopup/,
  "Profile dialog should open hosted OAuth linking in a real popup window.",
)

assert.doesNotMatch(
  source,
  /<iframe/,
  "Profile dialog should not iframe hosted provider pages because WeChat authorization blocks cross-origin iframe completion.",
)

assert.doesNotMatch(
  source,
  /OAuthLinkDialog|oauthDialog|setOauthDialog|等待授权完成|等待扫码确认|重新打开授权窗口|新窗口打开/,
  "Profile dialog should not render a custom OAuth waiting dialog now that the official provider popup is the only scan UI.",
)

assert.doesNotMatch(
  source,
  /unlinkIdentity/,
  "Profile dialog should not expose unlinking in this release.",
)

console.log("Profile dialog exposes identity binding status without unlinking.")
