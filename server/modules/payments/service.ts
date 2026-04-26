import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import type {
  AdminWechatPaymentSettingsResponseData,
  AdminUpdateWechatPaymentSettingsRequest,
  PaymentOrderResponseData,
  PaymentPlanCode,
  SubscriptionMeResponseData,
} from "@/lib/api/contracts/payment"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  buildPaymentOrderNo,
  maskPaymentSecret,
  normalizeWechatPaymentConfigPatch,
  normalizeWechatPaymentConfigInput,
  normalizeWechatTradeStateForOrder,
} from "./model.ts"
import {
  buildWechatPayAuthorizationHeader,
  decryptWechatPayResource,
  verifyWechatPaySignature,
} from "./wechat-crypto.ts"

const SETTINGS_ID = 1
const SECRET_KEY_VERSION = "v1"
const WECHAT_PAY_BASE_URL = "https://api.mch.weixin.qq.com"
const ORDER_EXPIRES_IN_MS = 30 * 60 * 1000
const WECHAT_PAY_REQUEST_TIMEOUT_MS = 8000

type EncryptedSecret = {
  ciphertext: string
  iv: string
  authTag: string
  keyVersion: string
}

type PaymentSettingsRow = {
  id: number
  enabled: boolean
  app_id: string | null
  mch_id: string | null
  notify_url: string | null
  merchant_serial_no: string | null
  merchant_private_key_ciphertext: string | null
  merchant_private_key_iv: string | null
  merchant_private_key_auth_tag: string | null
  api_v3_key_ciphertext: string | null
  api_v3_key_iv: string | null
  api_v3_key_auth_tag: string | null
  wechatpay_public_key_id: string | null
  wechatpay_public_key_ciphertext: string | null
  wechatpay_public_key_iv: string | null
  wechatpay_public_key_auth_tag: string | null
  secret_key_version: string | null
  updated_at: string | null
  updated_by_admin_id: string | null
}

type RuntimeWechatPaymentConfig = {
  enabled: boolean
  appId: string
  mchId: string
  notifyUrl: string
  merchantSerialNo: string
  merchantPrivateKeyPem: string
  apiV3Key: string
  wechatpayPublicKeyId: string
  wechatpayPublicKeyPem: string
}

type SubscriptionPlanRow = {
  code: PaymentPlanCode
  name: string
  price_cents: number
  currency: "CNY"
  duration_days: number
  tier_rank: number
  description: string
  features: string[]
  active: boolean
}

type PaymentOrderRow = {
  id: string
  user_id: string
  order_no: string
  plan_code: PaymentPlanCode
  plan_name: string
  amount_cents: number
  currency: "CNY"
  status: PaymentOrderResponseData["status"]
  code_url: string | null
  wechat_transaction_id: string | null
  paid_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

type UserSubscriptionRow = {
  user_id: string
  plan_code: string
  status: "active" | "expired"
  starts_at: string
  expires_at: string
}

function getSecretEncryptionKey() {
  const raw = process.env.AI_PROVIDER_SECRET_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("Missing required environment variable: AI_PROVIDER_SECRET_ENCRYPTION_KEY")
  }
  return createHash("sha256").update(raw, "utf8").digest()
}

function encryptSecret(secret: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getSecretEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: SECRET_KEY_VERSION,
  }
}

function decryptSecret(input: {
  ciphertext: string | null
  iv: string | null
  authTag: string | null
}) {
  if (!input.ciphertext || !input.iv || !input.authTag) return null
  const decipher = createDecipheriv("aes-256-gcm", getSecretEncryptionKey(), Buffer.from(input.iv, "base64"))
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

function configured(row: PaymentSettingsRow) {
  return Boolean(
    row.enabled
    && row.app_id
    && row.mch_id
    && row.notify_url
    && row.merchant_serial_no
    && row.merchant_private_key_ciphertext
    && row.api_v3_key_ciphertext
    && row.wechatpay_public_key_id
    && row.wechatpay_public_key_ciphertext,
  )
}

function presentPaymentSettings(row: PaymentSettingsRow): AdminWechatPaymentSettingsResponseData {
  return {
    enabled: row.enabled,
    configured: configured(row),
    appId: row.app_id,
    mchId: row.mch_id,
    notifyUrl: row.notify_url,
    merchantSerialNo: row.merchant_serial_no,
    merchantPrivateKeyMasked: maskPaymentSecret(row.merchant_private_key_ciphertext),
    apiV3KeyMasked: maskPaymentSecret(row.api_v3_key_ciphertext),
    wechatpayPublicKeyId: row.wechatpay_public_key_id,
    wechatpayPublicKeyMasked: maskPaymentSecret(row.wechatpay_public_key_ciphertext),
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

async function loadPaymentSettingsRow() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single()
  assertSupabaseSuccess(error, "failed to load payment settings")
  return data as PaymentSettingsRow
}

async function loadRuntimeWechatPaymentConfig(): Promise<RuntimeWechatPaymentConfig> {
  const row = await loadPaymentSettingsRow()
  const config = {
    enabled: row.enabled,
    appId: row.app_id ?? "",
    mchId: row.mch_id ?? "",
    notifyUrl: row.notify_url ?? "",
    merchantSerialNo: row.merchant_serial_no ?? "",
    merchantPrivateKeyPem: decryptSecret({
      ciphertext: row.merchant_private_key_ciphertext,
      iv: row.merchant_private_key_iv,
      authTag: row.merchant_private_key_auth_tag,
    }) ?? "",
    apiV3Key: decryptSecret({
      ciphertext: row.api_v3_key_ciphertext,
      iv: row.api_v3_key_iv,
      authTag: row.api_v3_key_auth_tag,
    }) ?? "",
    wechatpayPublicKeyId: row.wechatpay_public_key_id ?? "",
    wechatpayPublicKeyPem: decryptSecret({
      ciphertext: row.wechatpay_public_key_ciphertext,
      iv: row.wechatpay_public_key_iv,
      authTag: row.wechatpay_public_key_auth_tag,
    }) ?? "",
  }
  const parsed = normalizeWechatPaymentConfigInput(config)
  if (!parsed.ok || !parsed.data.enabled) {
    const error = new Error("微信支付配置未启用或不完整。")
    error.name = "PAYMENT_CONFIG_INCOMPLETE"
    throw error
  }
  return parsed.data
}

async function loadPlan(planCode: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("code", planCode)
    .eq("active", true)
    .single()
  assertSupabaseSuccess(error, "failed to load subscription plan")
  return data as SubscriptionPlanRow
}

function mapOrder(row: PaymentOrderRow): PaymentOrderResponseData {
  return {
    orderNo: row.order_no,
    planCode: row.plan_code,
    planName: row.plan_name,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    codeUrl: row.code_url,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function validateWechatPayResponseHeaders(input: {
  headers: Headers
  expectedWechatpayPublicKeyId: string
}) {
  const signature = input.headers.get("Wechatpay-Signature")
  const timestamp = input.headers.get("Wechatpay-Timestamp")
  const nonce = input.headers.get("Wechatpay-Nonce")
  const serial = input.headers.get("Wechatpay-Serial")
  if (!signature || !timestamp || !nonce || !serial) {
    const error = new Error("微信支付响应缺少签名头。")
    error.name = "PAYMENT_PROVIDER_ERROR"
    throw error
  }
  if (serial !== input.expectedWechatpayPublicKeyId) {
    const error = new Error("微信支付响应公钥 ID 不匹配。")
    error.name = "PAYMENT_PROVIDER_ERROR"
    throw error
  }
  return { signature, timestamp, nonce }
}

async function callWechatPay<T>(input: {
  config: RuntimeWechatPaymentConfig
  method: "GET" | "POST"
  pathWithQuery: string
  body?: Record<string, unknown>
}) {
  const body = input.body ? JSON.stringify(input.body) : ""
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WECHAT_PAY_REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${WECHAT_PAY_BASE_URL}${input.pathWithQuery}`, {
      method: input.method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "CodeTutor/0.1",
        "Authorization": buildWechatPayAuthorizationHeader({
          method: input.method,
          pathWithQuery: input.pathWithQuery,
          body,
          mchid: input.config.mchId,
          serialNo: input.config.merchantSerialNo,
          privateKeyPem: input.config.merchantPrivateKeyPem,
        }),
      },
      body: body || undefined,
      signal: controller.signal,
    })
  } catch (fetchError) {
    const error = new Error(fetchError instanceof Error && fetchError.name === "AbortError"
      ? "微信支付请求超时。"
      : "微信支付请求失败。")
    error.name = "PAYMENT_PROVIDER_ERROR"
    throw error
  } finally {
    clearTimeout(timeout)
  }
  const responseBody = await response.text()
  if (response.ok) {
    const { signature, timestamp, nonce } = validateWechatPayResponseHeaders({
      headers: response.headers,
      expectedWechatpayPublicKeyId: input.config.wechatpayPublicKeyId,
    })
    const verified = verifyWechatPaySignature({
      publicKeyPem: input.config.wechatpayPublicKeyPem,
      signature,
      timestamp,
      nonce,
      body: responseBody,
    })
    if (!verified) {
      const error = new Error("微信支付响应验签失败。")
      error.name = "PAYMENT_PROVIDER_ERROR"
      throw error
    }
  }
  const json = responseBody ? JSON.parse(responseBody) as T : ({} as T)
  if (!response.ok) {
    const error = new Error(`微信支付请求失败：${response.status}`)
    error.name = "PAYMENT_PROVIDER_ERROR"
    throw error
  }
  return json
}

export async function getWechatPaymentSettings() {
  return presentPaymentSettings(await loadPaymentSettingsRow())
}

export async function updateWechatPaymentSettings(
  adminAccountId: string,
  input: AdminUpdateWechatPaymentSettingsRequest,
) {
  const supabase = createSupabaseAdminClient()
  const before = await loadPaymentSettingsRow()
  const parsed = normalizeWechatPaymentConfigPatch(input, {
    enabled: before.enabled,
    appId: before.app_id,
    mchId: before.mch_id,
    notifyUrl: before.notify_url,
    merchantSerialNo: before.merchant_serial_no,
    merchantPrivateKeyConfigured: Boolean(before.merchant_private_key_ciphertext),
    apiV3KeyConfigured: Boolean(before.api_v3_key_ciphertext),
    wechatpayPublicKeyId: before.wechatpay_public_key_id,
    wechatpayPublicKeyConfigured: Boolean(before.wechatpay_public_key_ciphertext),
  })
  if (!parsed.ok) {
    const error = new Error(parsed.message)
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const updatePayload: Record<string, unknown> = {
    enabled: parsed.data.enabled,
    app_id: parsed.data.appId,
    mch_id: parsed.data.mchId,
    notify_url: parsed.data.notifyUrl,
    merchant_serial_no: parsed.data.merchantSerialNo,
    wechatpay_public_key_id: parsed.data.wechatpayPublicKeyId,
    secret_key_version: SECRET_KEY_VERSION,
    updated_by_admin_id: adminAccountId,
  }
  if (parsed.data.merchantPrivateKeyPem) {
    const merchantPrivateKey = encryptSecret(parsed.data.merchantPrivateKeyPem)
    updatePayload.merchant_private_key_ciphertext = merchantPrivateKey.ciphertext
    updatePayload.merchant_private_key_iv = merchantPrivateKey.iv
    updatePayload.merchant_private_key_auth_tag = merchantPrivateKey.authTag
  }
  if (parsed.data.apiV3Key) {
    const apiV3Key = encryptSecret(parsed.data.apiV3Key)
    updatePayload.api_v3_key_ciphertext = apiV3Key.ciphertext
    updatePayload.api_v3_key_iv = apiV3Key.iv
    updatePayload.api_v3_key_auth_tag = apiV3Key.authTag
  }
  if (parsed.data.wechatpayPublicKeyPem) {
    const wechatpayPublicKey = encryptSecret(parsed.data.wechatpayPublicKeyPem)
    updatePayload.wechatpay_public_key_ciphertext = wechatpayPublicKey.ciphertext
    updatePayload.wechatpay_public_key_iv = wechatpayPublicKey.iv
    updatePayload.wechatpay_public_key_auth_tag = wechatpayPublicKey.authTag
  }

  const { data, error } = await supabase
    .from("payment_settings")
    .update(updatePayload)
    .eq("id", SETTINGS_ID)
    .select("*")
    .single()
  assertSupabaseSuccess(error, "failed to update payment settings")
  await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminAccountId,
    action: "payment_settings_update",
    target_type: "payment_settings",
    target_id: String(SETTINGS_ID),
    before_snapshot: presentPaymentSettings(before),
    after_snapshot: presentPaymentSettings(data as PaymentSettingsRow),
    reason: null,
    request_context: null,
  })
  return presentPaymentSettings(data as PaymentSettingsRow)
}

export async function createWechatNativeOrder(userId: string, input: { planCode: string }) {
  const [config, plan] = await Promise.all([
    loadRuntimeWechatPaymentConfig(),
    loadPlan(input.planCode),
  ])
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ORDER_EXPIRES_IN_MS).toISOString()
  const orderNo = buildPaymentOrderNo(now)
  const supabase = createSupabaseAdminClient()
  const { data: created, error: insertError } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_no: orderNo,
      plan_code: plan.code,
      plan_name: plan.name,
      amount_cents: plan.price_cents,
      currency: plan.currency,
      status: "created",
      expires_at: expiresAt,
    })
    .select("*")
    .single()
  assertSupabaseSuccess(insertError, "failed to create payment order")

  const result = await callWechatPay<{ code_url: string }>({
    config,
    method: "POST",
    pathWithQuery: "/v3/pay/transactions/native",
    body: {
      appid: config.appId,
      mchid: config.mchId,
      description: `CodeTutor ${plan.name}`,
      out_trade_no: orderNo,
      notify_url: config.notifyUrl,
      time_expire: expiresAt,
      amount: {
        total: plan.price_cents,
        currency: plan.currency,
      },
    },
  })

  const { data: updated, error } = await supabase
    .from("payment_orders")
    .update({
      status: "prepay_created",
      code_url: result.code_url,
      wechat_prepay_payload: result,
    })
    .eq("id", (created as PaymentOrderRow).id)
    .select("*")
    .single()
  assertSupabaseSuccess(error, "failed to update payment order prepay")
  return mapOrder(updated as PaymentOrderRow)
}

export async function getPaymentOrderForUser(userId: string, orderNo: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("order_no", orderNo)
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to load payment order")
  return data ? mapOrder(data as PaymentOrderRow) : null
}

async function completePaidOrder(row: PaymentOrderRow, transaction: Record<string, unknown>) {
  if (row.status === "paid") return row
  const paidAt = typeof transaction.success_time === "string"
    ? transaction.success_time
    : new Date().toISOString()
  const supabase = createSupabaseAdminClient()
  const { data: updated, error } = await supabase
    .rpc("complete_paid_payment_order", {
      p_order_no: row.order_no,
      p_transaction: transaction,
      p_paid_at: paidAt,
    })
    .select("*")
    .single()
  assertSupabaseSuccess(error, "failed to mark order paid")
  return updated as PaymentOrderRow
}

export async function syncPaymentOrderForUser(userId: string, orderNo: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("order_no", orderNo)
    .maybeSingle()
  assertSupabaseSuccess(error, "failed to load payment order")
  if (!data) return null
  const row = data as PaymentOrderRow
  if (row.status === "paid") return mapOrder(row)
  const config = await loadRuntimeWechatPaymentConfig()
  const transaction = await callWechatPay<Record<string, unknown>>({
    config,
    method: "GET",
    pathWithQuery: `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderNo)}?mchid=${encodeURIComponent(config.mchId)}`,
  })
  if (transaction.trade_state === "SUCCESS") {
    return mapOrder(await completePaidOrder(row, transaction))
  }
  const terminalStatus = normalizeWechatTradeStateForOrder({
    tradeState: transaction.trade_state,
    localExpiresAt: row.expires_at,
  })
  if (terminalStatus) {
    const { data: updated, error: updateError } = await supabase
      .from("payment_orders")
      .update({
        status: terminalStatus,
        wechat_trade_state: typeof transaction.trade_state === "string" ? transaction.trade_state : terminalStatus.toUpperCase(),
        wechat_callback_payload: transaction,
      })
      .eq("id", row.id)
      .neq("status", "paid")
      .select("*")
      .single()
    assertSupabaseSuccess(updateError, "failed to update terminal payment order")
    return mapOrder(updated as PaymentOrderRow)
  }
  return mapOrder(row)
}

export async function handleWechatPaymentNotify(input: {
  headers: Headers
  rawBody: string
}) {
  const config = await loadRuntimeWechatPaymentConfig()
  const signature = input.headers.get("Wechatpay-Signature")
  const timestamp = input.headers.get("Wechatpay-Timestamp")
  const nonce = input.headers.get("Wechatpay-Nonce")
  const serial = input.headers.get("Wechatpay-Serial")
  if (!signature || !timestamp || !nonce || !serial) {
    throw new Error("微信支付回调缺少签名头。")
  }
  if (serial !== config.wechatpayPublicKeyId) {
    throw new Error("微信支付回调公钥 ID 不匹配。")
  }
  if (!verifyWechatPaySignature({
    publicKeyPem: config.wechatpayPublicKeyPem,
    timestamp,
    nonce,
    body: input.rawBody,
    signature,
  })) {
    throw new Error("微信支付回调验签失败。")
  }
  const payload = JSON.parse(input.rawBody) as {
    id?: string
    resource?: {
      associated_data?: string
      nonce?: string
      ciphertext?: string
    }
  }
  const resource = payload.resource
  if (!resource?.associated_data || !resource.nonce || !resource.ciphertext) {
    throw new Error("微信支付回调资源不完整。")
  }
  const transaction = decryptWechatPayResource({
    apiV3Key: config.apiV3Key,
    associatedData: resource.associated_data,
    nonce: resource.nonce,
    ciphertext: resource.ciphertext,
  })
  const orderNo = typeof transaction.out_trade_no === "string" ? transaction.out_trade_no : ""
  if (!orderNo || transaction.trade_state !== "SUCCESS") {
    throw new Error("微信支付回调状态不是成功支付。")
  }
  if (transaction.appid !== config.appId || transaction.mchid !== config.mchId) {
    throw new Error("微信支付回调商户身份不匹配。")
  }
  const supabase = createSupabaseAdminClient()
  const { error: eventInsertError } = await supabase.from("payment_webhook_events").insert({
    wechat_event_id: payload.id ?? null,
    order_no: orderNo,
    headers: Object.fromEntries(input.headers.entries()),
    payload,
    decrypted_payload: transaction,
  })
  if (eventInsertError && eventInsertError.code !== "23505") {
    assertSupabaseSuccess(eventInsertError, "failed to record payment webhook event")
  }
  const { data, error } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("order_no", orderNo)
    .single()
  assertSupabaseSuccess(error, "failed to load callback payment order")
  const row = data as PaymentOrderRow
  if (Number(transaction.amount && typeof transaction.amount === "object" ? (transaction.amount as { total?: unknown }).total : null) !== row.amount_cents) {
    throw new Error("微信支付回调金额不匹配。")
  }
  await completePaidOrder(row, transaction)
}

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionMeResponseData> {
  const supabase = createSupabaseAdminClient()
  const [{ data: plans, error: plansError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      supabase.from("subscription_plans").select("*").eq("active", true).order("tier_rank", { ascending: true }),
      supabase.from("user_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    ])
  assertSupabaseSuccess(plansError, "failed to load subscription plans")
  assertSupabaseSuccess(subscriptionError, "failed to load user subscription")
  const rows = (plans ?? []) as SubscriptionPlanRow[]
  const sub = subscription as UserSubscriptionRow | null
  const now = Date.now()
  const active = sub && new Date(sub.expires_at).getTime() > now
  const plan = active ? rows.find((item) => item.code === sub.plan_code) : null
  const expiresAt = active ? sub.expires_at : null

  return {
    current: {
      planCode: plan?.code ?? "free",
      planName: plan?.name ?? "免费版",
      status: plan ? "active" : sub ? "expired" : "free",
      startsAt: active ? sub.starts_at : null,
      expiresAt,
      remainingDays: expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000)) : 0,
    },
    plans: rows.map((item) => ({
      code: item.code,
      name: item.name,
      priceCents: item.price_cents,
      currency: item.currency,
      durationDays: item.duration_days,
      tierRank: item.tier_rank,
      description: item.description,
      features: item.features ?? [],
    })),
  }
}
