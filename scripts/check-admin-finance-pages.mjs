import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("admin sidebar exposes finance management group", () => {
  const menu = readFileSync("features/admin-shell/data/menu-config.ts", "utf8")

  assert.match(menu, /财务管理/)
  assert.match(menu, /订单列表/)
  assert.match(menu, /财务统计/)
  assert.match(menu, /\/admin\/finance\/orders/)
  assert.match(menu, /\/admin\/finance\/stats/)
})

test("admin finance pages are routed", () => {
  const listPage = readFileSync("app/(admin-shell)/admin/finance/orders/page.tsx", "utf8")
  const detailPage = readFileSync("app/(admin-shell)/admin/finance/orders/[orderNo]/page.tsx", "utf8")
  const statsPage = readFileSync("app/(admin-shell)/admin/finance/stats/page.tsx", "utf8")

  assert.match(listPage, /AdminFinanceOrdersPage/)
  assert.match(detailPage, /AdminFinanceOrderDetailPage/)
  assert.match(statsPage, /AdminFinanceStatsPage/)
})

test("admin finance components call finance APIs", () => {
  const list = readFileSync("features/admin-finance/components/admin-finance-orders-page.tsx", "utf8")
  const detail = readFileSync("features/admin-finance/components/admin-finance-order-detail-page.tsx", "utf8")
  const stats = readFileSync("features/admin-finance/components/admin-finance-stats-page.tsx", "utf8")

  assert.match(list, /\/admin\/finance\/orders/)
  assert.match(detail, /\/admin\/finance\/orders\/\$\{orderNo\}/)
  assert.match(stats, /\/admin\/finance\/stats/)
})
