import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("orders page is registered as a protected workspace route", () => {
  const routes = readFileSync("constants/routes.ts", "utf8")
  const proxy = readFileSync("proxy.ts", "utf8")

  assert.match(routes, /orders:\s*"\/orders"/)
  assert.match(routes, /ROUTES\.orders/)
  assert.match(proxy, /"\/orders"/)
})

test("workspace navigation exposes order management", () => {
  const nav = readFileSync("constants/navigation.ts", "utf8")

  assert.match(nav, /订单管理/)
  assert.match(nav, /ROUTES\.orders/)
})

test("orders page includes payment actions and history-style shell", () => {
  const page = readFileSync("features/orders/pages/orders-page.tsx", "utf8")
  const list = readFileSync("features/orders/components/order-list.tsx", "utf8")

  assert.match(page, /AppShell/)
  assert.match(page, /WorkspaceSidebar/)
  assert.match(page, /\/payment\/orders/)
  assert.match(list, /继续支付/)
  assert.match(list, /取消订单/)
  assert.match(list, /删除记录/)
})
