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
  /我的资料|安全设置|管理员账号|角色权限|操作审计|系统信息/,
  "The admin settings page should expose all governance settings sections",
)

assert.match(
  `${settingsSource}\n${profileDialogSource}`,
  /资料编辑|修改密码|登录邮箱|联系邮箱/,
  "The admin settings page should expose profile, login email and password actions",
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
  /操作审计|目标类型|操作人|原因/,
  "The admin settings page should expose an audit log section",
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
