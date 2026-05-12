import test from "node:test"
import assert from "node:assert/strict"

import {
  createPaymentOrderCancelPostHandler,
  createPaymentOrderContinuePostHandler,
  createPaymentOrderDeleteHandler,
  createPaymentOrdersGetHandler,
} from "../server/modules/payments/route-handler.ts"
import type {
  PaymentOrderListResponseData,
  PaymentOrderResponseData,
} from "../lib/api/contracts/payment.ts"

const okUser = { ok: true as const, userId: "user-1" }
const forbiddenUser = { ok: false as const, message: "需要登录" }

const sampleOrder: PaymentOrderResponseData = {
  orderNo: "CT202605110001",
  planCode: "personal_monthly",
  planName: "个人版",
  amountCents: 3900,
  currency: "CNY",
  status: "prepay_created",
  paymentChannel: "wechat",
  codeUrl: "weixin://pay",
  expiresAt: "2026-05-11T12:30:00.000Z",
  paidAt: null,
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
}

const sampleList: PaymentOrderListResponseData = {
  items: [sampleOrder],
  total: 1,
  page: 1,
  pageSize: 10,
  hasMore: false,
  summary: {
    totalCount: 1,
    pendingCount: 1,
    paidCount: 0,
    closedCount: 0,
    expiredCount: 0,
    failedCount: 0,
  },
}

test("payment orders list requires user auth", async () => {
  const handler = createPaymentOrdersGetHandler({
    getRequestUser: async () => forbiddenUser,
    getPaymentOrdersForUser: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(new Request("http://localhost/api/payment/orders"))
  assert.equal(res.status, 401)
})

test("payment orders list forwards normalized query to service", async () => {
  let captured: unknown
  const handler = createPaymentOrdersGetHandler({
    getRequestUser: async () => okUser,
    getPaymentOrdersForUser: async (_userId, query) => {
      captured = query
      return sampleList
    },
  })

  const res = await handler(
    new Request("http://localhost/api/payment/orders?page=2&pageSize=5&status=paid&channel=alipay"),
  )

  assert.equal(res.status, 200)
  assert.deepEqual(captured, {
    page: 2,
    pageSize: 5,
    status: "paid",
    channel: "alipay",
  })
})

test("payment order cancel returns updated order for owner", async () => {
  const handler = createPaymentOrderCancelPostHandler({
    getRequestUser: async () => okUser,
    cancelPaymentOrderForUser: async (userId, orderNo) => ({
      ...sampleOrder,
      orderNo,
      status: userId === "user-1" ? "closed" : "prepay_created",
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/payment/orders/CT202605110001/cancel", { method: "POST" }),
    { params: Promise.resolve({ orderNo: "CT202605110001" }) },
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.status, "closed")
})

test("payment order continue returns refreshed payment credential for owner", async () => {
  const handler = createPaymentOrderContinuePostHandler({
    getRequestUser: async () => okUser,
    continuePaymentOrderForUser: async (userId, orderNo) => ({
      ...sampleOrder,
      orderNo,
      codeUrl: userId === "user-1" ? "weixin://wxpay/bizpayurl?pr=refreshed" : null,
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/payment/orders/CT202605110001/continue", { method: "POST" }),
    { params: Promise.resolve({ orderNo: "CT202605110001" }) },
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.codeUrl, "weixin://wxpay/bizpayurl?pr=refreshed")
})

test("payment order delete returns not found for inaccessible order", async () => {
  const handler = createPaymentOrderDeleteHandler({
    getRequestUser: async () => okUser,
    softDeletePaymentOrderForUser: async () => null,
  })

  const res = await handler(
    new Request("http://localhost/api/payment/orders/CT202605110001", { method: "DELETE" }),
    { params: Promise.resolve({ orderNo: "CT202605110001" }) },
  )
  assert.equal(res.status, 404)
})

test("createWechatNativeOrder calls wechat first so failed prepay never leaves a dangling row", async () => {
  const { readFileSync } = await import("node:fs")
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  // 下单链路必须先调 callWechatPay 拿到 code_url，成功后才 insert。
  // 失败时应在 insert 之前就抛出 PAYMENT_PROVIDER_ERROR，不会留下 status='created' 的悬挂行。
  const wechatFn = source.slice(source.indexOf("export async function createWechatNativeOrder("))
  assert.ok(wechatFn.length > 0, "createWechatNativeOrder 未找到")
  const insertIndex = wechatFn.indexOf(".from(\"payment_orders\")")
  const callIndex = wechatFn.indexOf("callWechatPay<")
  assert.ok(callIndex >= 0 && insertIndex >= 0)
  assert.ok(callIndex < insertIndex, "callWechatPay 必须在 payment_orders insert 之前执行")
})

test("createAlipayPrecreateOrder calls alipay first so failed prepay never leaves a dangling row", async () => {
  const { readFileSync } = await import("node:fs")
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const alipayFn = source.slice(source.indexOf("export async function createAlipayPrecreateOrder("))
  assert.ok(alipayFn.length > 0, "createAlipayPrecreateOrder 未找到")
  const insertIndex = alipayFn.indexOf(".from(\"payment_orders\")")
  const callIndex = alipayFn.indexOf("callAlipayPagePay(")
  assert.ok(callIndex >= 0 && insertIndex >= 0)
  assert.ok(callIndex < insertIndex, "callAlipayPagePay 必须在 payment_orders insert 之前执行")
})

test("buildPaymentOrderNo appends a CSPRNG suffix with sufficient entropy", async () => {
  const { buildPaymentOrderNo } = await import("../server/modules/payments/model.ts")
  const date = new Date("2026-05-11T12:00:00.000Z")
  const samples = new Set<string>()
  for (let i = 0; i < 200; i += 1) samples.add(buildPaymentOrderNo(date))
  // 熵足够：200 次生成基本不碰撞
  assert.ok(samples.size >= 199)
  for (const no of samples) {
    // CT + 14 位时间戳 + 8 位十六进制（来自 randomBytes(4)）
    assert.match(no, /^CT\d{14}[0-9A-F]{8}$/)
  }
})

test("mapOrder does not silently default payment_channel to wechat", async () => {
  const { readFileSync } = await import("node:fs")
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  // payment_channel 迁移 037 已设为 NOT NULL DEFAULT 'wechat'，
  // 不应再用 ?? "wechat" 兜底，否则数据损坏时会静默掩盖故障。
  assert.doesNotMatch(source, /payment_channel \?\? "wechat"/)
})

test("service.ts does not write secret_key_version in update payloads", async () => {
  const { readFileSync } = await import("node:fs")
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  // secret_key_version 是未完成的密钥轮换机制，写入但从不消费，
  // 移除写入避免误导未来维护者。DB 字段保留向前兼容。
  assert.doesNotMatch(source, /secret_key_version: SECRET_KEY_VERSION/)
})
