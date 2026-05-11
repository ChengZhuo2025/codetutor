import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminFinanceOrderDetailGetHandler,
  createAdminFinanceOrderSyncPostHandler,
  createAdminFinanceOrdersGetHandler,
  createAdminFinanceStatsGetHandler,
} from "../server/modules/payments/route-handler.ts"
import type {
  AdminFinanceOrderDetailResponseData,
  AdminFinanceOrderListResponseData,
  AdminFinanceStatsResponseData,
} from "../lib/api/contracts/payment.ts"

const okAdmin = { ok: true as const, adminId: "admin-1" }
const forbiddenAdmin = { ok: false as const, message: "管理员登录态无效" }

const order = {
  orderNo: "CT202605110001",
  userId: "user-1",
  userNickname: "Bao",
  userPhone: "13800000000",
  planCode: "personal_monthly",
  planName: "个人版",
  amountCents: 3900,
  currency: "CNY" as const,
  status: "paid" as const,
  paymentChannel: "alipay" as const,
  providerTradeNo: "202605112200",
  paidAt: "2026-05-11T12:10:00.000Z",
  expiresAt: "2026-05-11T12:30:00.000Z",
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:10:00.000Z",
}

const list: AdminFinanceOrderListResponseData = {
  items: [order],
  total: 1,
  page: 1,
  limit: 20,
  stats: {
    totalOrders: 1,
    paidOrders: 1,
    pendingOrders: 0,
    revenueCents: 3900,
  },
}

const detail: AdminFinanceOrderDetailResponseData = {
  order: {
    ...order,
    codeUrl: null,
    userDeletedAt: null,
    cancelledAt: null,
    cancelReason: null,
    wechatTransactionId: null,
    alipayTradeNo: "202605112200",
    prepayPayload: {},
    callbackPayload: {},
  },
  timeline: [
    { label: "创建订单", at: "2026-05-11T12:00:00.000Z", status: "created" },
    { label: "支付成功", at: "2026-05-11T12:10:00.000Z", status: "paid" },
  ],
}

const stats: AdminFinanceStatsResponseData = {
  range: {
    dateFrom: "2026-05-01",
    dateTo: "2026-05-11",
  },
  overview: {
    revenueCents: 3900,
    paidOrders: 1,
    pendingOrders: 0,
    closedOrders: 0,
    expiredOrders: 0,
    failedOrders: 0,
    averageOrderValueCents: 3900,
  },
  channelBreakdown: [
    { channel: "alipay", revenueCents: 3900, paidOrders: 1 },
  ],
  planBreakdown: [
    { planCode: "personal_monthly", planName: "个人版", revenueCents: 3900, paidOrders: 1 },
  ],
  dailyTrend: [
    { date: "2026-05-11", revenueCents: 3900, paidOrders: 1 },
  ],
}

test("admin finance orders require admin auth", async () => {
  const handler = createAdminFinanceOrdersGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminFinanceOrders: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(new Request("http://localhost/api/admin/finance/orders"))
  assert.equal(res.status, 403)
})

test("admin finance orders parse filters", async () => {
  let captured: unknown
  const handler = createAdminFinanceOrdersGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminFinanceOrders: async (query) => {
      captured = query
      return list
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/finance/orders?page=2&limit=10&status=paid&channel=alipay&keyword=bao&dateFrom=2026-05-01&dateTo=2026-05-11"),
  )

  assert.equal(res.status, 200)
  assert.deepEqual(captured, {
    page: 2,
    limit: 10,
    status: "paid",
    channel: "alipay",
    planCode: "",
    keyword: "bao",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-11",
  })
})

test("admin finance order detail returns 404 when missing", async () => {
  const handler = createAdminFinanceOrderDetailGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminFinanceOrderDetail: async () => null,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/finance/orders/CT202605110001"),
    { params: Promise.resolve({ orderNo: "CT202605110001" }) },
  )
  assert.equal(res.status, 404)
})

test("admin finance order sync returns updated detail", async () => {
  const handler = createAdminFinanceOrderSyncPostHandler({
    getRequestAdmin: async () => okAdmin,
    syncAdminFinanceOrder: async () => detail,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/finance/orders/CT202605110001/sync", { method: "POST" }),
    { params: Promise.resolve({ orderNo: "CT202605110001" }) },
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.order.status, "paid")
})

test("admin finance stats returns aggregate payload", async () => {
  const handler = createAdminFinanceStatsGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminFinanceStats: async () => stats,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/finance/stats?dateFrom=2026-05-01&dateTo=2026-05-11"),
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.overview.revenueCents, 3900)
})

test("admin finance service reads user profile phone for required contact display", async () => {
  const serviceSource = await import("node:fs").then(({ readFileSync }) =>
    readFileSync("server/modules/payments/service.ts", "utf8"),
  )

  assert.match(serviceSource, /userPhone/)
  assert.match(serviceSource, /user_profile_export_view/)
  assert.match(serviceSource, /select\("user_id,nickname,auth_phone"\)/)
  assert.doesNotMatch(serviceSource, /select\("user_id,nickname,phone"\)/)
  assert.doesNotMatch(serviceSource, /select\("user_id,nickname,contact_email"\)/)
})
