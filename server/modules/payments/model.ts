import "server-only"

export type WechatPaymentConfigInput = {
  enabled?: unknown
  appId?: unknown
  mchId?: unknown
  notifyUrl?: unknown
  merchantSerialNo?: unknown
  merchantPrivateKeyPem?: unknown
  apiV3Key?: unknown
  wechatpayPublicKeyId?: unknown
  wechatpayPublicKeyPem?: unknown
}

export type NormalizedWechatPaymentConfigInput = {
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

export type ExistingWechatPaymentConfigPatchSnapshot = {
  enabled?: boolean
  appId?: string | null
  mchId?: string | null
  notifyUrl?: string | null
  merchantSerialNo?: string | null
  merchantPrivateKeyConfigured?: boolean
  apiV3KeyConfigured?: boolean
  wechatpayPublicKeyId?: string | null
  wechatpayPublicKeyConfigured?: boolean
}

export type NormalizedWechatPaymentConfigPatch = {
  enabled: boolean
  appId: string
  mchId: string
  notifyUrl: string
  merchantSerialNo: string
  merchantPrivateKeyPem: string | null
  apiV3Key: string | null
  wechatpayPublicKeyId: string
  wechatpayPublicKeyPem: string | null
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "VALIDATION_FAILED"; message: string }

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function requireField(value: unknown, label: string): ParseResult<string> {
  const normalized = trimString(value)
  if (!normalized) {
    return { ok: false, code: "VALIDATION_FAILED", message: `${label} 不能为空。` }
  }
  return { ok: true, data: normalized }
}

function validatePem(value: string, label: string) {
  if (!value.includes("-----BEGIN") || !value.includes("-----END")) {
    return { ok: false as const, code: "VALIDATION_FAILED" as const, message: `${label} 必须是 PEM 格式。` }
  }
  return null
}

export function normalizeWechatPaymentConfigInput(
  input: WechatPaymentConfigInput,
): ParseResult<NormalizedWechatPaymentConfigInput> {
  const enabled = input.enabled === true
  const fields = {
    appId: requireField(input.appId, "AppID"),
    mchId: requireField(input.mchId, "商户号"),
    notifyUrl: requireField(input.notifyUrl, "支付回调地址"),
    merchantSerialNo: requireField(input.merchantSerialNo, "商户证书序列号"),
    merchantPrivateKeyPem: requireField(input.merchantPrivateKeyPem, "商户私钥"),
    apiV3Key: requireField(input.apiV3Key, "APIv3 密钥"),
    wechatpayPublicKeyId: requireField(input.wechatpayPublicKeyId, "微信支付公钥 ID"),
    wechatpayPublicKeyPem: requireField(input.wechatpayPublicKeyPem, "微信支付公钥"),
  }

  if (enabled) {
    for (const result of Object.values(fields)) {
      if (!result.ok) return result
    }
  }

  const appId = fields.appId.ok ? fields.appId.data : ""
  const mchId = fields.mchId.ok ? fields.mchId.data : ""
  const notifyUrl = fields.notifyUrl.ok ? fields.notifyUrl.data : ""
  const merchantSerialNo = fields.merchantSerialNo.ok ? fields.merchantSerialNo.data : ""
  const merchantPrivateKeyPem = fields.merchantPrivateKeyPem.ok ? fields.merchantPrivateKeyPem.data : ""
  const apiV3Key = fields.apiV3Key.ok ? fields.apiV3Key.data : ""
  const wechatpayPublicKeyId = fields.wechatpayPublicKeyId.ok ? fields.wechatpayPublicKeyId.data : ""
  const wechatpayPublicKeyPem = fields.wechatpayPublicKeyPem.ok ? fields.wechatpayPublicKeyPem.data : ""

  if (notifyUrl) {
    try {
      const url = new URL(notifyUrl)
      if (url.protocol !== "https:" || url.search) {
        return { ok: false, code: "VALIDATION_FAILED", message: "支付回调地址必须是 HTTPS 且不能包含查询参数。" }
      }
    } catch {
      return { ok: false, code: "VALIDATION_FAILED", message: "支付回调地址格式不正确。" }
    }
  }

  if (apiV3Key && Buffer.from(apiV3Key, "utf8").length !== 32) {
    return { ok: false, code: "VALIDATION_FAILED", message: "APIv3 密钥必须是 32 字节。" }
  }

  const privateKeyError = merchantPrivateKeyPem ? validatePem(merchantPrivateKeyPem, "商户私钥") : null
  if (privateKeyError) return privateKeyError
  const publicKeyError = wechatpayPublicKeyPem ? validatePem(wechatpayPublicKeyPem, "微信支付公钥") : null
  if (publicKeyError) return publicKeyError

  return {
    ok: true,
    data: {
      enabled,
      appId,
      mchId,
      notifyUrl,
      merchantSerialNo,
      merchantPrivateKeyPem,
      apiV3Key,
      wechatpayPublicKeyId,
      wechatpayPublicKeyPem,
    },
  }
}

function mergeStringField(inputValue: unknown, existingValue: string | null | undefined) {
  const normalized = trimString(inputValue)
  if (normalized) return normalized
  return existingValue?.trim() ?? ""
}

export function normalizeWechatPaymentConfigPatch(
  input: WechatPaymentConfigInput,
  existing: ExistingWechatPaymentConfigPatchSnapshot = {},
): ParseResult<NormalizedWechatPaymentConfigPatch> {
  const enabled = input.enabled === undefined ? existing.enabled === true : input.enabled === true
  const appId = mergeStringField(input.appId, existing.appId)
  const mchId = mergeStringField(input.mchId, existing.mchId)
  const notifyUrl = mergeStringField(input.notifyUrl, existing.notifyUrl)
  const merchantSerialNo = mergeStringField(input.merchantSerialNo, existing.merchantSerialNo)
  const merchantPrivateKeyPem = trimString(input.merchantPrivateKeyPem) || null
  const apiV3Key = trimString(input.apiV3Key) || null
  const wechatpayPublicKeyId = mergeStringField(input.wechatpayPublicKeyId, existing.wechatpayPublicKeyId)
  const wechatpayPublicKeyPem = trimString(input.wechatpayPublicKeyPem) || null

  if (notifyUrl) {
    try {
      const url = new URL(notifyUrl)
      if (url.protocol !== "https:" || url.search) {
        return { ok: false, code: "VALIDATION_FAILED", message: "支付回调地址必须是 HTTPS 且不能包含查询参数。" }
      }
    } catch {
      return { ok: false, code: "VALIDATION_FAILED", message: "支付回调地址格式不正确。" }
    }
  }

  if (apiV3Key && Buffer.from(apiV3Key, "utf8").length !== 32) {
    return { ok: false, code: "VALIDATION_FAILED", message: "APIv3 密钥必须是 32 字节。" }
  }

  const privateKeyError = merchantPrivateKeyPem ? validatePem(merchantPrivateKeyPem, "商户私钥") : null
  if (privateKeyError) return privateKeyError
  const publicKeyError = wechatpayPublicKeyPem ? validatePem(wechatpayPublicKeyPem, "微信支付公钥") : null
  if (publicKeyError) return publicKeyError

  if (enabled) {
    const required = [
      [appId, "AppID"],
      [mchId, "商户号"],
      [notifyUrl, "支付回调地址"],
      [merchantSerialNo, "商户证书序列号"],
      [wechatpayPublicKeyId, "微信支付公钥 ID"],
    ] as const
    for (const [value, label] of required) {
      if (!value) return { ok: false, code: "VALIDATION_FAILED", message: `${label} 不能为空。` }
    }
    if (!merchantPrivateKeyPem && !existing.merchantPrivateKeyConfigured) {
      return { ok: false, code: "VALIDATION_FAILED", message: "商户私钥不能为空。" }
    }
    if (!apiV3Key && !existing.apiV3KeyConfigured) {
      return { ok: false, code: "VALIDATION_FAILED", message: "APIv3 密钥不能为空。" }
    }
    if (!wechatpayPublicKeyPem && !existing.wechatpayPublicKeyConfigured) {
      return { ok: false, code: "VALIDATION_FAILED", message: "微信支付公钥不能为空。" }
    }
  }

  return {
    ok: true,
    data: {
      enabled,
      appId,
      mchId,
      notifyUrl,
      merchantSerialNo,
      merchantPrivateKeyPem,
      apiV3Key,
      wechatpayPublicKeyId,
      wechatpayPublicKeyPem,
    },
  }
}

export function parsePaymentPlanCode(value: unknown): ParseResult<string> {
  const normalized = typeof value === "string" ? value.trim() : ""
  if (!/^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/.test(normalized)) {
    return { ok: false, code: "VALIDATION_FAILED", message: "套餐编码不合法。" }
  }
  return { ok: true, data: normalized }
}

export function buildPaymentOrderNo(date = new Date()) {
  const stamp = date.toISOString().replace(/\D/g, "").slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `CT${stamp}${suffix}`
}

export function normalizeWechatTradeStateForOrder(input: {
  tradeState: unknown
  localExpiresAt: string
  now?: string
}): "closed" | "expired" | "failed" | null {
  const nowTime = new Date(input.now ?? new Date().toISOString()).getTime()
  const expiresAtTime = new Date(input.localExpiresAt).getTime()
  if (Number.isFinite(expiresAtTime) && expiresAtTime <= nowTime) return "expired"
  if (input.tradeState === "CLOSED" || input.tradeState === "REVOKED") return "closed"
  if (input.tradeState === "PAYERROR") return "failed"
  return null
}

export function addDaysIso(start: string, days: number) {
  const date = new Date(start)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

export function applyPaidOrderToSubscriptionSnapshot(input: {
  currentSubscription: {
    planCode: string
    expiresAt: string | null
  } | null
  paidAt: string
  purchasedPlan: {
    planCode: string
    tierRank: number
    durationDays: number
  }
}) {
  const currentExpiresAt = input.currentSubscription?.expiresAt ?? null
  const currentActive = currentExpiresAt
    ? new Date(currentExpiresAt).getTime() > new Date(input.paidAt).getTime()
    : false
  const samePlan = input.currentSubscription?.planCode === input.purchasedPlan.planCode

  const startsAt = samePlan && currentActive && currentExpiresAt ? currentExpiresAt : input.paidAt

  return {
    planCode: input.purchasedPlan.planCode,
    startsAt,
    expiresAt: addDaysIso(startsAt, input.purchasedPlan.durationDays),
  }
}

export function maskPaymentSecret(value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) return "未配置"
  if (normalized.includes("-----BEGIN")) return "••••••••••"
  if (normalized.length <= 8) return "*".repeat(8)
  return `${normalized.slice(0, 4)}${"*".repeat(Math.min(12, normalized.length - 8))}${normalized.slice(-4)}`
}
