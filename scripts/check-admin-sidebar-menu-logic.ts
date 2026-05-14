import test from "node:test"
import assert from "node:assert/strict"

import {
  getNextExpandedAdminMenuHref,
  getRenderedExpandedAdminMenuHref,
  isAdminMenuItemActive,
} from "../features/admin-shell/lib/sidebar-menu.ts"

const adminHome = { label: "总览看板", href: "/admin" }
const adminAI = {
  label: "Ai 管理",
  href: "/admin/ai",
  children: [
    { label: "AI 概览", href: "/admin/ai" },
    { label: "Model 管理", href: "/admin/ai/models" },
  ],
}
const adminMedia = {
  label: "多媒体管理",
  href: "/admin/ai/media",
  children: [
    { label: "转译设置", href: "/admin/ai/media/transcription-settings" },
    { label: "附件管理", href: "/admin/ai/media/attachments" },
  ],
}
const adminFinance = {
  label: "财务管理",
  href: "/admin/finance",
  children: [
    { label: "订单列表", href: "/admin/finance/orders" },
    { label: "财务统计", href: "/admin/finance/stats" },
  ],
}
const menuItems = [adminHome, adminAI, adminMedia, adminFinance]

test("media routes only mark multimedia management active among top-level menu groups", () => {
  const pathname = "/admin/ai/media/transcription-settings"

  assert.equal(isAdminMenuItemActive(adminAI, pathname, menuItems), false)
  assert.equal(isAdminMenuItemActive(adminMedia, pathname, menuItems), true)
  assert.equal(isAdminMenuItemActive(adminFinance, pathname, menuItems), false)
})

test("AI routes outside media still mark AI management active", () => {
  const pathname = "/admin/ai/models"

  assert.equal(isAdminMenuItemActive(adminAI, pathname, menuItems), true)
  assert.equal(isAdminMenuItemActive(adminMedia, pathname, menuItems), false)
})

test("opening one top-level submenu closes the previously expanded submenu", () => {
  assert.equal(getNextExpandedAdminMenuHref("/admin/ai", "/admin/finance"), "/admin/finance")
})

test("clicking the expanded top-level submenu collapses it", () => {
  assert.equal(getNextExpandedAdminMenuHref("/admin/finance", "/admin/finance"), null)
})

test("initial submenu expansion follows the active route until manually changed", () => {
  assert.equal(getRenderedExpandedAdminMenuHref(undefined, "/admin/ai/media"), "/admin/ai/media")
  assert.equal(getRenderedExpandedAdminMenuHref(null, "/admin/ai/media"), null)
  assert.equal(getRenderedExpandedAdminMenuHref("/admin/finance", "/admin/ai/media"), "/admin/finance")
})
