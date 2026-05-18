import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const menuConfig = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)
const siteInformationPage = readFileSync(
  new URL("../features/admin-site/components/site-information-page.tsx", import.meta.url),
  "utf8",
)
const siteArticlesPage = readFileSync(
  new URL("../features/admin-site/components/site-articles-page.tsx", import.meta.url),
  "utf8",
)
const footer = readFileSync(
  new URL("../features/marketing/components/footer.tsx", import.meta.url),
  "utf8",
)
const loginBrandPanel = readFileSync(
  new URL("../features/auth/components/login-brand-panel.tsx", import.meta.url),
  "utf8",
)

assert.match(menuConfig, /label:\s*"站点信息"/, "admin menu should include 站点信息")
assert.match(menuConfig, /href:\s*"\/admin\/site\/information"/, "admin menu should link to website information")
assert.match(menuConfig, /href:\s*"\/admin\/site\/articles"/, "admin menu should link to site articles")

assert.match(siteInformationPage, /\/admin\/site\/information/, "site information page should call admin information API")
assert.match(siteInformationPage, /\/admin\/site\/logo-upload/, "site information page should upload logo")
assert.match(siteInformationPage, /seoKeywords/, "site information page should edit SEO keywords")
assert.match(siteInformationPage, /备案号/, "site information page should expose ICP number")

assert.match(siteArticlesPage, /about_us/, "site article page should manage about us")
assert.match(siteArticlesPage, /user_agreement/, "site article page should manage user agreement")
assert.match(siteArticlesPage, /privacy_policy/, "site article page should manage privacy policy")
assert.match(siteArticlesPage, /Markdown/, "site article page should expose markdown editing")

assert.match(footer, /usePublicSite/, "marketing footer should read public site data")
assert.match(footer, /privacyPolicy/, "marketing footer should render managed privacy policy")
assert.match(loginBrandPanel, /usePublicSite/, "login page brand panel should read public site data")

console.log("Admin site pages and public site wiring are present.")
