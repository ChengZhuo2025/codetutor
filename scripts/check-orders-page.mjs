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

  assert.match(nav, /订阅记录/)
  assert.match(nav, /ROUTES\.orders/)
})

test("orders page includes payment actions and history-style shell", () => {
  const page = readFileSync("features/orders/pages/orders-page.tsx", "utf8")
  const list = readFileSync("features/orders/components/order-list.tsx", "utf8")
  const service = readFileSync("server/modules/payments/service.ts", "utf8")

  assert.match(page, /AppShell/)
  assert.match(page, /WorkspaceSidebar/)
  assert.match(page, /SubscriptionDetailDialog/)
  assert.match(page, /\/payment\/orders/)
  assert.match(page, /DialogContent/)
  assert.match(page, /\/payment\/orders\/\$\{order\.orderNo\}\/continue/)
  assert.match(page, /订单状态同步失败/)
  assert.match(page, /订阅套餐/)
  assert.match(page, /EMPTY_SUBSCRIPTION_SNAPSHOT/)
  assert.match(list, /继续支付/)
  assert.match(list, /取消订单/)
  assert.match(list, /删除记录/)
  assert.match(list, /emptyAction/)
  assert.match(service, /isAlipayTradeNotExistError/)
  assert.match(service, /status:\s*"failed"/)
})
