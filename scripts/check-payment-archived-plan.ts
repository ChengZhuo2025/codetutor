import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("migration 039 rewrites complete_paid_payment_order without active-plan filter", () => {
  const migration = readFileSync("supabase/migrations/039_finance_hardening.sql", "utf8")
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.complete_paid_payment_order/)
  // 必须按 plan_code 查订阅套餐，但不能再强制 active = TRUE
  // 否则用户付款后套餐被管理员归档，订阅无法开通，订单卡在 prepay_created。
  assert.match(migration, /WHERE code = v_order\.plan_code\s*;/)
  assert.doesNotMatch(migration, /WHERE code = v_order\.plan_code[\s\S]*AND active = TRUE/)
})

test("archiveAdminSubscriptionPlan rejects archive when pending payment orders exist", async () => {
  // service.ts 内部使用 createSupabaseAdminClient，单测无法直接注入 mock。
  // 因此把 sanity check 抽成纯函数 `assertNoPendingOrdersForPlan` 并在此断言其行为。
  const mod = await import("../server/modules/payments/service.ts") as unknown as {
    assertNoPendingOrdersForPlan?: (count: number, code: string) => void
  }
  assert.equal(typeof mod.assertNoPendingOrdersForPlan, "function", "assertNoPendingOrdersForPlan 应从 service.ts 导出")
  assert.throws(
    () => mod.assertNoPendingOrdersForPlan!(1, "personal_monthly"),
    (error: Error) => error.name === "VALIDATION_FAILED" && /personal_monthly/.test(error.message),
  )
  assert.doesNotThrow(() => mod.assertNoPendingOrdersForPlan!(0, "personal_monthly"))
})
