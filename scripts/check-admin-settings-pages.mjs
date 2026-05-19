import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const settingsSource = readFileSync(
  new URL("../features/admin-settings/components/system-settings.tsx", import.meta.url),
  "utf8",
)

const profileDialogSource = readFileSync(
  new URL("../features/admin-shell/components/admin-profile-edit-dialog.tsx", import.meta.url),
  "utf8",
)

const packageSource = readFileSync(
  new URL("../package.json", import.meta.url),
  "utf8",
)
const packageJson = JSON.parse(packageSource)

const appConstantsSource = readFileSync(
  new URL("../constants/app.ts", import.meta.url),
  "utf8",
)

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

assert.match(
  settingsSource,
  /系统设置/,
  "The admin settings page should render the settings title",
)

assert.match(
  settingsSource,
  /管理员账号|角色权限|订阅套餐|支付配置|联系方式|操作审计|系统信息/,
  "The admin settings page should expose governance, payment, contact, audit and system sections",
)

assert.doesNotMatch(
  settingsSource,
  /label: "我的资料"|label: "安全设置"|activeTab === "profile"|activeTab === "security"/,
  "The admin settings page should not duplicate profile or security tabs",
)

assert.match(
  settingsSource,
  /const TABS[\s\S]*accounts[\s\S]*roles[\s\S]*plans[\s\S]*payment[\s\S]*contact[\s\S]*audit[\s\S]*system/,
  "The admin settings tabs should order contact after payment, with audit and system last",
)

assert.match(
  profileDialogSource,
  /资料编辑|修改密码|登录邮箱|联系邮箱/,
  "The admin account menu profile dialog should expose profile, login email and password actions",
)

assert.match(
  profileDialogSource,
  /\/admin\/profile\/login-email/,
  "The admin profile dialog should call the dedicated login email endpoint",
)

assert.match(
  settingsSource,
  /启用|停用|最后登录|角色权限/,
  "The admin settings admin-account section should expose status operations and role data",
)

assert.match(
  settingsSource,
  /RoleTag/,
  "The admin settings page should use a shared role tag component",
)

assert.match(
  settingsSource,
  /AdminAccountStatusTag/,
  "The admin settings page should use a shared admin-account status tag component",
)

assert.match(
  settingsSource,
  /ConfigurationStatusTag/,
  "The admin settings page should use a shared configuration-status tag component",
)

assert.match(
  settingsSource,
  /SubscriptionPlanStatusTag|category="tone"/,
  "The admin settings page should use shared admin-tag components for role and status labels",
)

assert.doesNotMatch(
  settingsSource,
  /AdminListTag|getRoleTagStyle|getStatusBadgeClass|getStatusLabel/,
  "The admin settings page should not keep legacy local tag styling helpers",
)

assert.match(
  settingsSource,
  /操作审计|目标类型|操作人|原因/,
  "The admin settings page should expose an audit log section",
)

assert.match(
  settingsSource,
  /网站信息|网站展示内容|应用与基础设施|开发团队|维护联系人|合规与版权/,
  "The system information tab should expose managed website information, runtime infrastructure, team, maintainer and compliance sections",
)

assert.match(
  settingsSource,
  /大包子|18600165902|baoyouhua@zhicool\.cn|微信号[\s\S]*baoyouhua|Codex \(GPT-5\.5\)|siteInformation\.icpNumber/,
  "The system information tab should include the configured maintainer, WeChat, AI collaborator and backend-backed ICP record",
)

assert.match(
  settingsSource,
  /usePublicSite\(\)[\s\S]*siteInformation\.siteName[\s\S]*siteInformation\.siteSubtitle[\s\S]*siteInformation\.version[\s\S]*siteInformation\.siteSlogan[\s\S]*siteInformation\.siteDescription[\s\S]*siteInformation\.seoKeywords[\s\S]*siteInformation\.copyright/,
  "The system information tab should read website identity, content, version, copyright and ICP values from public site data",
)

assert.match(
  `${packageSource}\n${appConstantsSource}`,
  new RegExp(packageJson.version.replaceAll(".", "\\.")),
  "The system information tab should align with the current app version",
)

assert.match(
  settingsSource,
  /订阅套餐/,
  "The admin settings page should expose a subscription plans section",
)

assert.match(
  settingsSource,
  /创建套餐|编辑套餐|归档套餐/,
  "The subscription plans section should expose create, edit, and archive operations",
)

assert.match(
  settingsSource,
  /appPrivateKeyPem: ""/,
  "The Alipay payment settings form should initialize the app private key as blank",
)

assert.match(
  settingsSource,
  /alipayPublicKeyPem: ""/,
  "The Alipay payment settings form should initialize the public key as blank",
)

assert.match(
  settingsSource,
  /setAlipayForm\(\(\) => \(\{[\s\S]*appPrivateKeyPem: "",[\s\S]*alipayPublicKeyPem: "",[\s\S]*\}\)\)/,
  "The Alipay payment settings refresh should clear sensitive key inputs after reading saved settings",
)

assert.match(
  menuSource,
  /label: "系统设置".*active: true/s,
  "The admin menu should enable the system settings entry",
)

console.log("Admin settings page exposes the expected governance information architecture.")
