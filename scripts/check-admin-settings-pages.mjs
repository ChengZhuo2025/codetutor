import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const settingsSource = readFileSync(
  new URL("../features/admin-settings/components/system-settings.tsx", import.meta.url),
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
  settingsSource,
  /资料编辑|修改密码/,
  "The admin settings page should expose profile and password actions",
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
  menuSource,
  /label: "系统设置".*active: true/s,
  "The admin menu should enable the system settings entry",
)

console.log("Admin settings page exposes the expected governance information architecture.")
