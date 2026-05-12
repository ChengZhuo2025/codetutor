import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// 确保两个下单 API（微信 Native、支付宝 Precreate）在 route 入口接入 applyWindowRateLimit，
// 并限制为 per-user 10 次 / 分钟，避免用户在前端连点、脚本刷单击穿第三方 QPS。

test("wechat native-orders route wires applyWindowRateLimit per user", () => {
  const source = readFileSync("app/api/payment/wechat/native-orders/route.ts", "utf8")
  assert.match(source, /applyWindowRateLimit/)
  assert.match(source, /bucket: "payment_create_order"/)
  assert.match(source, /max: 10/)
  assert.match(source, /windowMs: 60_?000/)
})

test("alipay precreate-orders route wires applyWindowRateLimit per user", () => {
  const source = readFileSync("app/api/payment/alipay/precreate-orders/route.ts", "utf8")
  assert.match(source, /applyWindowRateLimit/)
  assert.match(source, /bucket: "payment_create_order"/)
  assert.match(source, /max: 10/)
  assert.match(source, /windowMs: 60_?000/)
})
