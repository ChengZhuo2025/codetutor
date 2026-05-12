import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// 集成脚本：验证支付订单完整状态流转链路的关键实现约束。
// 由于 service.ts 内部依赖 Supabase，无法直接调用，
// 通过源码结构断言确保链路完整性。

test("payment order state machine covers all terminal states", async () => {
  const { PAYMENT_ORDER_STATUSES } = await import("../lib/api/contracts/payment.ts")
  assert.deepEqual(
    [...PAYMENT_ORDER_STATUSES].sort(),
    ["closed", "created", "expired", "failed", "paid", "prepay_created"],
  )
})

test("createWechatNativeOrder inserts with status prepay_created not created", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function createWechatNativeOrder("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  // 新链路先调三方再落库，直接写 prepay_created，不再产生 created 状态的悬挂行
  assert.match(fnBody, /status: "prepay_created"/)
  assert.doesNotMatch(fnBody, /status: "created"/)
})

test("createAlipayPrecreateOrder inserts with status prepay_created not created", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function createAlipayPrecreateOrder("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  assert.match(fnBody, /status: "prepay_created"/)
  assert.doesNotMatch(fnBody, /status: "created"/)
})

test("cancelPaymentOrderForUser guards against cancelling paid orders", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function cancelPaymentOrderForUser("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  // 取消时必须用 .neq("status", "paid") 防止并发场景下取消已付款订单
  assert.match(fnBody, /\.neq\("status", "paid"\)/)
})

test("softDeletePaymentOrderForUser only allows terminal non-paid statuses", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fn = source.slice(source.indexOf("export async function softDeletePaymentOrderForUser("))
  const fnBody = fn.slice(0, fn.indexOf("\n}\n"))
  // 只允许 closed/expired/failed 状态的订单被软删除，paid 订单不可删
  assert.match(fnBody, /closed.*expired.*failed|expired.*closed.*failed/)
  assert.doesNotMatch(fnBody, /"paid".*softDelete|softDelete.*"paid"/)
})

test("complete_paid_payment_order RPC uses row-level locking for concurrent safety", () => {
  const migration = readFileSync("supabase/migrations/039_finance_hardening.sql", "utf8")
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /IF v_order\.status = 'paid' THEN\s+RETURN v_order/)
  // 不再要求 active = TRUE，归档套餐的已付款订单也能完成
  assert.doesNotMatch(migration, /AND active = TRUE/)
})

test("webhook idempotency uses unique index on event ids", () => {
  const migration034 = readFileSync("supabase/migrations/034_create_payment_subscription_tables.sql", "utf8")
  const migration037 = readFileSync("supabase/migrations/037_add_alipay_scan_payment.sql", "utf8")
  assert.match(migration034, /UNIQUE INDEX.*wechat_event_id/)
  assert.match(migration037, /UNIQUE INDEX.*alipay_notify_id/)
})

test("payment order no uses CSPRNG suffix", async () => {
  const { buildPaymentOrderNo } = await import("../server/modules/payments/model.ts")
  const no = buildPaymentOrderNo(new Date("2026-05-11T12:00:00.000Z"))
  assert.match(no, /^CT\d{14}[0-9A-F]{8}$/)
})

test("sanitizePaymentKeyword prevents PostgREST injection in finance search", async () => {
  const { sanitizePaymentKeyword } = await import("../server/modules/payments/model.ts")
  // 注入尝试：PostgREST .or() 元字符
  const malicious = "),(user_id.eq.00000000-0000-0000-0000-000000000001"
  const sanitized = sanitizePaymentKeyword(malicious)
  // 结果不含括号、逗号、点
  assert.doesNotMatch(sanitized, /[(),.]/)
})

test("isFreshTimestamp prevents webhook replay attacks", async () => {
  const { isFreshTimestamp } = await import("../server/modules/payments/model.ts")
  const now = Date.now()
  assert.equal(isFreshTimestamp(Math.floor(now / 1000), now), true)
  assert.equal(isFreshTimestamp(Math.floor(now / 1000) - 400, now), false)
})
