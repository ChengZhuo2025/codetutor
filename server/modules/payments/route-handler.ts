import { jsonAuthRequired, jsonError, jsonSuccess } from "@/server/lib/route-response"
import { parsePaymentPlanCode } from "./model.ts"
import type {
  AdminUpdateAlipayPaymentSettingsRequest,
  AdminUpsertSubscriptionPlanRequest,
  AdminUpdateWechatPaymentSettingsRequest,
  PaymentChannel,
  PaymentOrderStatus,
} from "@/lib/api/contracts/payment"

type RequestAuthResult = { ok: true; userId: string } | { ok: false; message: string }
type RequestAdminResult = { ok: true; adminId: string } | { ok: false; message: string }

function mapPaymentError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "PAYMENT_CONFIG_INCOMPLETE") {
      return jsonError("PAYMENT_CONFIG_INCOMPLETE", error.message, 409)
    }
    if (error.name === "VALIDATION_FAILED") {
      return jsonError("VALIDATION_FAILED", error.message, 400)
    }
    if (error.name === "PAYMENT_PROVIDER_ERROR") {
      return jsonError("PAYMENT_PROVIDER_ERROR", error.message, 502)
    }
  }
  return jsonError("INTERNAL_ERROR", "支付请求处理失败", 500)
}

export function createWechatNativeOrderPostHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  createWechatNativeOrder: (userId: string, input: { planCode: string }) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }

      const body = await request.json()
      const parsed = parsePaymentPlanCode((body as { planCode?: unknown })?.planCode)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 422)
      }

      const data = await dependencies.createWechatNativeOrder(auth.userId, {
        planCode: parsed.data,
      })
      return jsonSuccess(data, "微信支付订单已创建")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAlipayPrecreateOrderPostHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  createAlipayPrecreateOrder: (userId: string, input: { planCode: string }) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }

      const body = await request.json()
      const parsed = parsePaymentPlanCode((body as { planCode?: unknown })?.planCode)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 422)
      }

      const data = await dependencies.createAlipayPrecreateOrder(auth.userId, {
        planCode: parsed.data,
      })
      return jsonSuccess(data, "支付宝支付订单已创建")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createPaymentOrderGetHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  getPaymentOrderForUser: (userId: string, orderNo: string) => Promise<unknown | null>
}) {
  return async function GET(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const { orderNo } = await context.params
      const data = await dependencies.getPaymentOrderForUser(auth.userId, orderNo)
      if (!data) {
        return jsonError("NOT_FOUND", "支付订单不存在。", 404)
      }
      return jsonSuccess(data, "支付订单读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "支付订单读取失败", 500)
    }
  }
}

function parseUserOrderListQuery(request: Request) {
  const url = new URL(request.url)
  return {
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "10"),
    status: (url.searchParams.get("status") ?? "all") as PaymentOrderStatus | "all",
    channel: (url.searchParams.get("channel") ?? "all") as PaymentChannel | "all",
  }
}

function parseAdminFinanceOrderQuery(request: Request) {
  const url = new URL(request.url)
  return {
    page: Number(url.searchParams.get("page") ?? "1"),
    limit: Number(url.searchParams.get("limit") ?? "20"),
    status: (url.searchParams.get("status") ?? "all") as PaymentOrderStatus | "all",
    channel: (url.searchParams.get("channel") ?? "all") as PaymentChannel | "all",
    planCode: url.searchParams.get("planCode")?.trim() ?? "",
    keyword: url.searchParams.get("keyword")?.trim() ?? "",
    dateFrom: url.searchParams.get("dateFrom")?.trim() ?? "",
    dateTo: url.searchParams.get("dateTo")?.trim() ?? "",
  }
}

function parseAdminFinanceStatsQuery(request: Request) {
  const url = new URL(request.url)
  return {
    dateFrom: url.searchParams.get("dateFrom")?.trim() ?? "",
    dateTo: url.searchParams.get("dateTo")?.trim() ?? "",
  }
}

export function createPaymentOrdersGetHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  getPaymentOrdersForUser: (userId: string, query: {
    page: number
    pageSize: number
    status: PaymentOrderStatus | "all"
    channel: PaymentChannel | "all"
  }) => Promise<unknown>
}) {
  return async function GET(request: Request) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const data = await dependencies.getPaymentOrdersForUser(auth.userId, parseUserOrderListQuery(request))
      return jsonSuccess(data, "支付订单列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "支付订单列表读取失败", 500)
    }
  }
}

export function createPaymentOrderCancelPostHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  cancelPaymentOrderForUser: (userId: string, orderNo: string) => Promise<unknown | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const { orderNo } = await context.params
      const data = await dependencies.cancelPaymentOrderForUser(auth.userId, orderNo)
      if (!data) return jsonError("NOT_FOUND", "支付订单不存在。", 404)
      return jsonSuccess(data, "支付订单已取消")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createPaymentOrderContinuePostHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  continuePaymentOrderForUser: (userId: string, orderNo: string) => Promise<unknown | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const { orderNo } = await context.params
      const data = await dependencies.continuePaymentOrderForUser(auth.userId, orderNo)
      if (!data) return jsonError("NOT_FOUND", "支付订单不存在。", 404)
      return jsonSuccess(data, "支付凭证已刷新")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createPaymentOrderDeleteHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  softDeletePaymentOrderForUser: (userId: string, orderNo: string) => Promise<unknown | null>
}) {
  return async function DELETE(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const { orderNo } = await context.params
      const data = await dependencies.softDeletePaymentOrderForUser(auth.userId, orderNo)
      if (!data) return jsonError("NOT_FOUND", "支付订单不存在。", 404)
      return jsonSuccess(data, "支付订单已删除")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createPaymentOrderSyncPostHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  syncPaymentOrderForUser: (userId: string, orderNo: string) => Promise<unknown | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const { orderNo } = await context.params
      const data = await dependencies.syncPaymentOrderForUser(auth.userId, orderNo)
      if (!data) {
        return jsonError("NOT_FOUND", "支付订单不存在。", 404)
      }
      return jsonSuccess(data, "支付订单已同步")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createSubscriptionMeGetHandler(dependencies: {
  getRequestUser: (request: unknown) => Promise<RequestAuthResult>
  getSubscriptionForUser: (userId: string) => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const auth = await dependencies.getRequestUser(request)
      if (!auth.ok) {
        return jsonAuthRequired(auth.message)
      }
      const data = await dependencies.getSubscriptionForUser(auth.userId)
      return jsonSuccess(data, "订阅信息读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "订阅信息读取失败", 500)
    }
  }
}

export function createSubscriptionPlansGetHandler(dependencies: {
  getPublicSubscriptionPlans: () => Promise<unknown>
}) {
  return async function GET() {
    try {
      const data = await dependencies.getPublicSubscriptionPlans()
      return jsonSuccess(data, "订阅套餐读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "订阅套餐读取失败", 500)
    }
  }
}

export function createWechatPaymentNotifyPostHandler(dependencies: {
  handleWechatPaymentNotify: (input: {
    headers: Headers
    rawBody: string
  }) => Promise<void>
}) {
  return async function POST(request: Request) {
    try {
      const rawBody = await request.text()
      await dependencies.handleWechatPaymentNotify({
        headers: request.headers,
        rawBody,
      })
      return Response.json({ code: "SUCCESS", message: "成功" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "回调处理失败"
      return Response.json({ code: "FAIL", message }, { status: 400 })
    }
  }
}

export function createAlipayNotifyPostHandler(dependencies: {
  handleAlipayPaymentNotify: (input: {
    form: Record<string, string>
  }) => Promise<void>
}) {
  return async function POST(request: Request) {
    try {
      const rawBody = await request.text()
      await dependencies.handleAlipayPaymentNotify({
        form: Object.fromEntries(new URLSearchParams(rawBody).entries()),
      })
      return new Response("success", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    } catch {
      return new Response("fail", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }
  }
}

export function createAdminWechatPaymentSettingsGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getWechatPaymentSettings: () => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.getWechatPaymentSettings()
      return jsonSuccess(data, "微信支付配置读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "微信支付配置读取失败", 500)
    }
  }
}

export function createAdminWechatPaymentSettingsPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  updateWechatPaymentSettings: (
    adminAccountId: string,
    input: AdminUpdateWechatPaymentSettingsRequest,
  ) => Promise<unknown>
}) {
  return async function PATCH(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const body = await request.json()
      const data = await dependencies.updateWechatPaymentSettings(admin.adminId, body as AdminUpdateWechatPaymentSettingsRequest)
      return jsonSuccess(data, "微信支付配置已更新")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminAlipayPaymentSettingsGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getAlipayPaymentSettings: () => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.getAlipayPaymentSettings()
      return jsonSuccess(data, "支付宝支付配置读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "支付宝支付配置读取失败", 500)
    }
  }
}

export function createAdminAlipayPaymentSettingsPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  updateAlipayPaymentSettings: (
    adminAccountId: string,
    input: AdminUpdateAlipayPaymentSettingsRequest,
  ) => Promise<unknown>
}) {
  return async function PATCH(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const body = await request.json()
      const data = await dependencies.updateAlipayPaymentSettings(admin.adminId, body as AdminUpdateAlipayPaymentSettingsRequest)
      return jsonSuccess(data, "支付宝支付配置已更新")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminSubscriptionPlansGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getAdminSubscriptionPlans: () => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.getAdminSubscriptionPlans()
      return jsonSuccess(data, "订阅套餐列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "订阅套餐列表读取失败", 500)
    }
  }
}

export function createAdminSubscriptionPlansPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  createAdminSubscriptionPlan: (
    adminAccountId: string,
    input: AdminUpsertSubscriptionPlanRequest,
  ) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.createAdminSubscriptionPlan(
        admin.adminId,
        await request.json() as AdminUpsertSubscriptionPlanRequest,
      )
      return jsonSuccess(data, "订阅套餐已创建")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminSubscriptionPlanPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  updateAdminSubscriptionPlan: (
    adminAccountId: string,
    code: string,
    input: AdminUpsertSubscriptionPlanRequest,
  ) => Promise<unknown | null>
}) {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ code: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { code } = await context.params
      const parsed = parsePaymentPlanCode(code)
      if (!parsed.ok) return jsonError(parsed.code, parsed.message, 400)
      const data = await dependencies.updateAdminSubscriptionPlan(
        admin.adminId,
        parsed.data,
        await request.json() as AdminUpsertSubscriptionPlanRequest,
      )
      if (!data) return jsonError("NOT_FOUND", "订阅套餐不存在。", 404)
      return jsonSuccess(data, "订阅套餐已更新")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminSubscriptionPlanDeleteHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  archiveAdminSubscriptionPlan: (
    adminAccountId: string,
    code: string,
  ) => Promise<unknown | null>
}) {
  return async function DELETE(
    request: unknown,
    context: { params: Promise<{ code: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { code } = await context.params
      const parsed = parsePaymentPlanCode(code)
      if (!parsed.ok) return jsonError(parsed.code, parsed.message, 400)
      const data = await dependencies.archiveAdminSubscriptionPlan(admin.adminId, parsed.data)
      if (!data) return jsonError("NOT_FOUND", "订阅套餐不存在。", 404)
      return jsonSuccess(data, "订阅套餐已归档")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminFinanceOrdersGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getAdminFinanceOrders: (query: ReturnType<typeof parseAdminFinanceOrderQuery>) => Promise<unknown>
}) {
  return async function GET(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.getAdminFinanceOrders(parseAdminFinanceOrderQuery(request))
      return jsonSuccess(data, "财务订单列表读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "财务订单列表读取失败", 500)
    }
  }
}

export function createAdminFinanceOrderDetailGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getAdminFinanceOrderDetail: (orderNo: string) => Promise<unknown | null>
}) {
  return async function GET(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { orderNo } = await context.params
      const data = await dependencies.getAdminFinanceOrderDetail(orderNo)
      if (!data) return jsonError("NOT_FOUND", "财务订单不存在。", 404)
      return jsonSuccess(data, "财务订单详情读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "财务订单详情读取失败", 500)
    }
  }
}

export function createAdminFinanceOrderSyncPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  syncAdminFinanceOrder: (orderNo: string) => Promise<unknown | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ orderNo: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { orderNo } = await context.params
      const data = await dependencies.syncAdminFinanceOrder(orderNo)
      if (!data) return jsonError("NOT_FOUND", "财务订单不存在。", 404)
      return jsonSuccess(data, "财务订单已同步")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}

export function createAdminFinanceStatsGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Promise<RequestAdminResult>
  getAdminFinanceStats: (query: ReturnType<typeof parseAdminFinanceStatsQuery>) => Promise<unknown>
}) {
  return async function GET(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const data = await dependencies.getAdminFinanceStats(parseAdminFinanceStatsQuery(request))
      return jsonSuccess(data, "财务统计读取成功")
    } catch {
      return jsonError("INTERNAL_ERROR", "财务统计读取失败", 500)
    }
  }
}
