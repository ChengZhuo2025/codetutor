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
  /usePublicSite\(\)/,
  "Landing footer should read public site data from the backend-backed provider.",
)
assert.match(
  footerSource,
  /articles\.privacyPolicy\.contentMarkdown/,
  "Landing footer should render privacy policy content from public site articles.",
)
assert.match(
  footerSource,
  /articles\.userAgreement\.contentMarkdown/,
  "Landing footer should render user agreement content from public site articles.",
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
  /PRIVACY_POLICY_CONTENT|USER_AGREEMENT_CONTENT|withLegalMeta/,
  "Login form should read agreement content from public site articles instead of legacy constants.",
)
assert.match(
  loginFormSource,
  /usePublicSite\(\)/,
  "Login form should read public site data from the backend-backed provider.",
)
assert.match(
  loginFormSource,
  /privacyPolicy\.contentMarkdown/,
  "Login form should render privacy policy content from public site articles.",
)
assert.match(
  loginFormSource,
  /userAgreement\.contentMarkdown/,
  "Login form should render user agreement content from public site articles.",
)

console.log("Landing legal dialogs read backend-backed public site articles.")
