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
const siteHelpCenterPage = readFileSync(
  new URL("../features/admin-site/components/site-help-center-page.tsx", import.meta.url),
  "utf8",
)
const footer = readFileSync(
  new URL("../features/marketing/components/footer.tsx", import.meta.url),
  "utf8",
)
const nav = readFileSync(
  new URL("../features/marketing/components/nav.tsx", import.meta.url),
  "utf8",
)
const loginBrandPanel = readFileSync(
  new URL("../features/auth/components/login-brand-panel.tsx", import.meta.url),
  "utf8",
)
const adminSidebar = readFileSync(
  new URL("../features/admin-shell/components/admin-sidebar.tsx", import.meta.url),
  "utf8",
)

assert.match(menuConfig, /label:\s*"站点信息"/, "admin menu should include 站点信息")
assert.match(menuConfig, /href:\s*"\/admin\/site\/information"/, "admin menu should link to website information")
assert.match(menuConfig, /href:\s*"\/admin\/site\/articles"/, "admin menu should link to site articles")
assert.match(menuConfig, /href:\s*"\/admin\/site\/help"/, "admin menu should link to help center")
assert.match(menuConfig, /label:\s*"帮助中心"/, "admin menu should include 帮助中心")

assert.match(siteInformationPage, /\/admin\/site\/information/, "site information page should call admin information API")
assert.match(siteInformationPage, /\/admin\/site\/logo-upload/, "site information page should upload logo")
assert.match(siteInformationPage, /seoKeywords/, "site information page should edit SEO keywords")
assert.match(siteInformationPage, /备案号/, "site information page should expose ICP number")
assert.match(siteInformationPage, /variant="secondary"[\s\S]*上传 Logo/, "site information page should use the shared secondary button style for the upload logo action")

assert.match(siteArticlesPage, /about_us/, "site article page should manage about us")
assert.match(siteArticlesPage, /user_agreement/, "site article page should manage user agreement")
assert.match(siteArticlesPage, /privacy_policy/, "site article page should manage privacy policy")
assert.match(siteArticlesPage, /Markdown/, "site article page should expose markdown editing")
assert.match(siteHelpCenterPage, /\/admin\/site\/help\/categories/, "help center page should call admin category API")
assert.match(siteHelpCenterPage, /\/admin\/site\/help\/items/, "help center page should call admin item API")
assert.match(siteHelpCenterPage, /分类/, "help center page should manage categories")
assert.match(siteHelpCenterPage, /问题/, "help center page should manage FAQ questions")
assert.match(siteHelpCenterPage, /Markdown/, "help center page should expose markdown editing")
assert.match(siteHelpCenterPage, /MarkdownContent/, "help center page should preview markdown answers")

assert.match(footer, /usePublicSite/, "marketing footer should read public site data")
assert.match(footer, /privacyPolicy/, "marketing footer should render managed privacy policy")
assert.match(nav, /v\{information\.version\} Beta/, "marketing nav should render managed site version")
assert.match(loginBrandPanel, /usePublicSite/, "login page brand panel should read public site data")
assert.match(adminSidebar, /information\.logoUrl/, "admin sidebar brand should render managed site logo")
assert.match(adminSidebar, /information\.siteName/, "admin sidebar brand should render managed site name")
assert.match(adminSidebar, /information\.version/, "admin sidebar brand should render managed site version")
assert.match(adminSidebar, /information\.copyright/, "admin sidebar footer should render managed copyright")

console.log("Admin site pages and public site wiring are present.")
