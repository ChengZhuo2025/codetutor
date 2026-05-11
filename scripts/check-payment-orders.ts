import test from "node:test"
import assert from "node:assert/strict"

import {
  createPaymentOrderCancelPostHandler,
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
