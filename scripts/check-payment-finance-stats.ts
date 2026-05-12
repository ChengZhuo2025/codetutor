import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("migration 039 defines finance_stats_daily RPC", () => {
  const migration = readFileSync("supabase/migrations/039_finance_hardening.sql", "utf8")
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.finance_stats_daily/)
  // 按天 / 按渠道 / 按套餐分别聚合
  assert.match(migration, /date_trunc\('day', created_at/)
  assert.match(migration, /GROUP BY[^\n]*payment_channel/)
  assert.match(migration, /GROUP BY[^\n]*plan_code/)
})

test("migration 039 defines user_payment_summary RPC", () => {
  const migration = readFileSync("supabase/migrations/039_finance_hardening.sql", "utf8")
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.user_payment_summary/)
})

test("service.ts uses finance_stats_daily RPC instead of in-memory aggregation", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function getAdminFinanceStats("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  // 必须调 RPC，不再用 .select() + reduce 在 Node 内存做聚合
  assert.match(fnBody, /\.rpc\("finance_stats_daily"/)
  assert.doesNotMatch(fnBody, /for \(const row of paidRows\)/)
})

test("service.ts uses user_payment_summary RPC for list summary", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function getPaymentOrdersForUser("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  assert.match(fnBody, /\.rpc\("user_payment_summary"/)
})
