import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const footerSource = readFileSync(
  new URL("../features/marketing/components/footer.tsx", import.meta.url),
  "utf8",
)
const loginFormSource = readFileSync(
  new URL("../features/auth/components/login-form.tsx", import.meta.url),
  "utf8",
)

assert.match(
  footerSource,
  /PRIVACY_POLICY_CONTENT/,
  "Landing footer should use the shared privacy policy content.",
)
assert.match(
  footerSource,
  /withLegalMeta\(PRIVACY_POLICY_CONTENT\)/,
  "Landing footer should render the same legal metadata as the login page.",
)
assert.match(
  footerSource,
  /USER_AGREEMENT_CONTENT/,
  "Landing footer should use the shared user agreement content.",
)
assert.match(
  footerSource,
  /withLegalMeta\(USER_AGREEMENT_CONTENT\)/,
  "Landing footer should render the same user agreement metadata as the login page.",
)
assert.doesNotMatch(
  footerSource,
  /隐私政策页面正在整理中/,
  "Landing footer should not show the old privacy policy placeholder copy.",
)
assert.doesNotMatch(
  footerSource,
  /使用条款/,
  "Landing footer should label the terms dialog as 用户协议.",
)
assert.doesNotMatch(
  loginFormSource,
  /const PRIVACY_POLICY_CONTENT = `/,
  "Login form should import shared privacy policy content instead of defining a private copy.",
)
assert.doesNotMatch(
  loginFormSource,
  /const USER_AGREEMENT_CONTENT = `/,
  "Login form should import shared user agreement content instead of defining a private copy.",
)

console.log("Landing legal dialogs reuse the shared legal content.")
