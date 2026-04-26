import { jsonAuthRequired, jsonError, jsonSuccess } from "@/server/lib/route-response"
import { parsePaymentPlanCode, normalizeWechatPaymentConfigInput } from "./model.ts"
import type {
  AdminUpdateWechatPaymentSettingsRequest,
} from "@/lib/api/contracts/payment"

type RequestAuthResult = { ok: true; userId: string } | { ok: false; message: string }
type RequestAdminResult = { ok: true; adminId: string } | { ok: false; message: string }

type RequestLike = {
  json: () => Promise<unknown>
  text?: () => Promise<string>
  headers?: Headers
}

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
  return async function POST(request: RequestLike) {
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
  return async function PATCH(request: RequestLike) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const body = await request.json()
      const parsed = normalizeWechatPaymentConfigInput(body as AdminUpdateWechatPaymentSettingsRequest)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      const data = await dependencies.updateWechatPaymentSettings(admin.adminId, parsed.data)
      return jsonSuccess(data, "微信支付配置已更新")
    } catch (error) {
      return mapPaymentError(error)
    }
  }
}
