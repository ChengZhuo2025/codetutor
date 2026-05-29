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
assert.match(siteHelpCenterPage, /DialogContent[\s\S]*分类设置/, "help center category editing should happen in a dialog")
assert.match(siteHelpCenterPage, /SheetContent[\s\S]*问题详情/, "help center item view and edit should happen in a right sheet")
assert.match(siteHelpCenterPage, /<table[\s\S]*当前分类下的问题/, "help center should render current category FAQ items as a table")
assert.match(siteHelpCenterPage, /查看[\s\S]*编辑/, "help center item action column should include view and edit actions")
assert.doesNotMatch(siteHelpCenterPage, /xl:grid-cols-\[300px_minmax\(0,1fr\)\]/, "help center should not keep the old nested item editor grid")
assert.match(siteHelpCenterPage, /HELP_CENTER_ICON_OPTIONS/, "help center category form should offer native icon options")
assert.match(siteHelpCenterPage, /iconKey/, "help center category form should persist an icon key")
assert.match(siteHelpCenterPage, /aria-pressed=\{selected\}/, "help center icon buttons should expose selected state")
assert.match(siteHelpCenterPage, /selected && [\s\S]*border-brand[\s\S]*ring-2/, "selected help center icons should have a visible selected style")
assert.match(siteHelpCenterPage, /Switch[\s\S]*openCategoryDialog/, "category cards should expose the enable switch before the edit dialog trigger")
assert.doesNotMatch(siteHelpCenterPage, /编辑分类<\/Button>/, "category cards should not keep the old text edit action")
assert.match(siteHelpCenterPage, /w-\[22%\][\s\S]*操作/, "help center item action column should be wide enough for inline actions")

assert.match(footer, /usePublicSite/, "marketing footer should read public site data")
assert.match(footer, /privacyPolicy/, "marketing footer should render managed privacy policy")
assert.match(nav, /v\{information\.version\} Beta/, "marketing nav should render managed site version")
assert.match(loginBrandPanel, /usePublicSite/, "login page brand panel should read public site data")
assert.match(adminSidebar, /information\.logoUrl/, "admin sidebar brand should render managed site logo")
assert.match(adminSidebar, /information\.siteName/, "admin sidebar brand should render managed site name")
assert.match(adminSidebar, /information\.version/, "admin sidebar brand should render managed site version")
assert.match(adminSidebar, /information\.copyright/, "admin sidebar footer should render managed copyright")

console.log("Admin site pages and public site wiring are present.")
