import test from "node:test"
import assert from "node:assert/strict"
import { createHash, createPublicKey, createSign } from "node:crypto"
import { readFileSync } from "node:fs"

import {
  buildWechatPayAuthorizationHeader,
  decryptWechatPayResource,
  verifyWechatPaySignature,
} from "../server/modules/payments/wechat-crypto.ts"
import {
  applyPaidOrderToSubscriptionSnapshot,
  normalizeWechatPaymentConfigPatch,
  normalizeWechatPaymentConfigInput,
  normalizeWechatTradeStateForOrder,
} from "../server/modules/payments/model.ts"
import { validateWechatPayResponseHeaders } from "../server/modules/payments/service.ts"
import {
  createWechatNativeOrderPostHandler,
  createPaymentOrderGetHandler,
} from "../server/modules/payments/route-handler.ts"

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJlw/Y2Ji3wfv1
bQuNij7xG/96tA9HutLwfaHHFdvG5WlvBmhLDl3G1tL5PytLFm/HWp8NajbN4NVU
ZhGeUTQYJxubq4qlMIOxS7gsgBnuMQEl/eX8OELlibAFw4s/FZ/z+9uMjfFIHV8n
eDkZJPB9y1nCixwICtLtpu26QWDiQ1ev3/tfiW52Ufb5l58chArm5Jq0/WVVQORM
CpikZ0VXLUFLAKo9wh9OEza4dYPgfj0JnimwEt7wG94z2aWrL7cUMQ/igVeF1/v2
Tiz1G3bCJQyFRCB3uEMecDcGEmgDUTKtBA0lt3JjczCgwokqC+y4raskm7DtIfpC
wnoZk1XLAgMBAAECggEAN9YsMQN5dXh5GfccupUervjy0CFclCEmuS8LJtIioFo9
1F9BdvyhM+if4iLBkphB2MV8haI0UN0kKa7l1WSnmcMHThx7GBsyduLCviyzQfr3
1vaXA7/vo5V6GHabtJsARXuuyaUtPizIhO2zXwgQxr8S+yQ93OpmlyXj9fGS7Mh9
dOCTdwJUkECtRGfhp35viOVQM/A50eTuhShB/rc1XntLm08WVKFqkkvLD4pCTyoZ
VPt4BuaZE2riqCo1mfURITtlqRE5qK6CTrlJwXs+aQ187rhVvnvL2hJSQQwCaf3n
675cpDtWOA8KwdgRQs38FHdd0Fu2k+f0rK/LF907TQKBgQDpwkxcNLuxuXCO+EHH
/KakOfWNbTC/VfS9LXycwpLZjK6EHU18hYZToklMQmzY+ah2JOFpexs74+o0unaQ
zYA2bcfFaZ1wB+Gk6igyw/meeFk3wGMe5vEQpfSl4Gvj6llMS08JkXrpGr0FdkQt
3VSNs995okIPQI0XoWUwW9jl9QKBgQDcxTigRBmNdQt3qHjLCklQmZ18vrb4B/z+
zi+tPuJC/wLomz9NLDmikMxJgkNzLs9IXNFiC3RDXgv+FwPnyME1EbnIqDFEyj+p
C2gXXBFo31fWF37+GUyTfgeYdhFPP1vKdpM9Ukc74CSlIMsaLpxLqAnSqHSRlMv9
l78to6I0vwKBgQC/1aNC3EfYXz2fJt8dFxtOlP4OFTi3HPxfL/Ae2ZMYE9q4My/+
67lD81/BxJV9Ls1wP235WX0NFkqDAS8CQJNil48lVDpO0Tj9VOiuWKQGx+830JvH
pXDZ38e5RUZlYVHtSbRQPuKmYDoVPGxRU1zreV0BfgZGbAweA2Z+XDHQ7QKBgA4y
CEAV4Oa9ne0lwg6cLLaoCf5ZbP5p1RS1QU+MeZQBPbijMuDNdS9EzD31yEyBuAZZ
IYWCYwlp5K+D31ZqDDJTX3TNi812i71c5GaMHvp1UfqMLDg+fDQHqIlfHiHQWyCb
m0AYKEhrUy/i+exHDvm2ZltLRaOOw8ccmMhgey+VAoGBAM3GpqIVWraj+YRRi9yE
GR1JPDW3TrL7sQg8yrsWHoU4E0KF2a7ZbDpByP08lzNJ0sVzIYOJDJABsbYNIMsw
sG8wVPSeNkM3QefUheaT/WrT9MeUgr7leEs6rqelNU/jzDfj2X5fglgoQi9pFWk/
Vm8/iafuLoxsx41QQk+YdEhj
-----END PRIVATE KEY-----`

const TEST_PUBLIC_KEY = createPublicKey(TEST_PRIVATE_KEY)
  .export({ type: "spki", format: "pem" })
  .toString()

test("buildWechatPayAuthorizationHeader signs canonical request fields", () => {
  const header = buildWechatPayAuthorizationHeader({
    method: "POST",
    pathWithQuery: "/v3/pay/transactions/native",
    body: '{"amount":{"total":3900}}',
    mchid: "1900000001",
    serialNo: "SERIAL123",
    privateKeyPem: TEST_PRIVATE_KEY,
    nonce: "nonce-123",
    timestamp: "1714051200",
  })

  assert.match(header, /^WECHATPAY2-SHA256-RSA2048 /)
  assert.match(header, /mchid="1900000001"/)
  assert.match(header, /serial_no="SERIAL123"/)
  assert.match(header, /nonce_str="nonce-123"/)
  assert.match(header, /timestamp="1714051200"/)
  assert.match(header, /signature="[^"]+"/)
})

test("verifyWechatPaySignature validates a WeChat response signature", () => {
  const timestamp = "1714051200"
  const nonce = "nonce-abc"
  const body = '{"id":"transaction-id","trade_state":"SUCCESS"}'
  const signer = createSign("RSA-SHA256")
  signer.update(`${timestamp}\n${nonce}\n${body}\n`)
  signer.end()
  const signature = signer.sign(TEST_PRIVATE_KEY).toString("base64")

  assert.equal(
    verifyWechatPaySignature({
      publicKeyPem: TEST_PUBLIC_KEY,
      timestamp,
      nonce,
      body,
      signature,
    }),
    true,
  )
  assert.equal(
    verifyWechatPaySignature({
      publicKeyPem: TEST_PUBLIC_KEY,
      timestamp,
      nonce,
      body: `${body} `,
      signature,
    }),
    false,
  )
})

test("decryptWechatPayResource decrypts APIv3 callback resource", async () => {
  const apiV3Key = "0123456789abcdef0123456789abcdef"
  const associatedData = "transaction"
  const nonce = "nonce-123456"
  const plaintext = JSON.stringify({ out_trade_no: "CT202604260001", trade_state: "SUCCESS" })
  const { createCipheriv } = await import("node:crypto")
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(nonce))
  cipher.setAAD(Buffer.from(associatedData))
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64")

  assert.deepEqual(
    decryptWechatPayResource({
      apiV3Key,
      associatedData,
      nonce,
      ciphertext,
    }),
    { out_trade_no: "CT202604260001", trade_state: "SUCCESS" },
  )
})

test("normalizeWechatPaymentConfigInput requires complete enabled config", () => {
  const parsed = normalizeWechatPaymentConfigInput({
    enabled: true,
    appId: "wx123",
    mchId: "1900000001",
    notifyUrl: "https://www.codetutor.cn/api/payment/wechat/notify",
    merchantSerialNo: "SERIAL123",
    merchantPrivateKeyPem: TEST_PRIVATE_KEY,
    apiV3Key: "0123456789abcdef0123456789abcdef",
    wechatpayPublicKeyId: "PUB_KEY_ID_123",
    wechatpayPublicKeyPem: TEST_PUBLIC_KEY,
  })

  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.data.enabled, true)
    assert.equal(parsed.data.apiV3Key.length, 32)
  }

  const invalid = normalizeWechatPaymentConfigInput({
    enabled: true,
    appId: "wx123",
  })
  assert.equal(invalid.ok, false)
})

test("applyPaidOrderToSubscriptionSnapshot extends same paid plan from current expiry", () => {
  const result = applyPaidOrderToSubscriptionSnapshot({
    currentSubscription: {
      planCode: "personal_monthly",
      expiresAt: "2026-05-10T00:00:00.000Z",
    },
    paidAt: "2026-04-26T00:00:00.000Z",
    purchasedPlan: {
      planCode: "personal_monthly",
      tierRank: 10,
      durationDays: 31,
    },
  })

  assert.equal(result.planCode, "personal_monthly")
  assert.equal(result.startsAt, "2026-05-10T00:00:00.000Z")
  assert.equal(result.expiresAt, "2026-06-10T00:00:00.000Z")
})

test("applyPaidOrderToSubscriptionSnapshot upgrades from paid time when target tier is higher", () => {
  const result = applyPaidOrderToSubscriptionSnapshot({
    currentSubscription: {
      planCode: "personal_monthly",
      expiresAt: "2026-05-10T00:00:00.000Z",
    },
    paidAt: "2026-04-26T00:00:00.000Z",
    purchasedPlan: {
      planCode: "pro_monthly",
      tierRank: 20,
      durationDays: 31,
    },
  })

  assert.equal(result.planCode, "pro_monthly")
  assert.equal(result.startsAt, "2026-04-26T00:00:00.000Z")
  assert.equal(result.expiresAt, "2026-05-27T00:00:00.000Z")
})

test("wechat native order route returns config error before creating order", async () => {
  const handler = createWechatNativeOrderPostHandler({
    getRequestUser: async () => ({ ok: true, userId: "user-1" }),
    createWechatNativeOrder: async () => {
      const error = new Error("微信支付配置未启用或不完整。")
      error.name = "PAYMENT_CONFIG_INCOMPLETE"
      throw error
    },
  })

  const res = await handler(new Request("http://localhost/api/payment/wechat/native-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planCode: "personal_monthly" }),
  }))
  assert.equal(res.status, 409)
  const json = await res.json()
  assert.equal(json.code, "PAYMENT_CONFIG_INCOMPLETE")
})

test("payment order detail route forbids reading another user's order", async () => {
  const handler = createPaymentOrderGetHandler({
    getRequestUser: async () => ({ ok: true, userId: "user-1" }),
    getPaymentOrderForUser: async () => null,
  })

  const res = await handler(
    new Request("http://localhost/api/payment/orders/CT202604260001"),
    { params: Promise.resolve({ orderNo: "CT202604260001" }) },
  )
  assert.equal(res.status, 404)
})

test("wechat payment config masks stored secrets using stable digest metadata", () => {
  const digest = createHash("sha256").update(TEST_PUBLIC_KEY, "utf8").digest("hex")
  assert.equal(digest.length, 64)
})

test("wechat payment settings patch preserves existing secrets when inputs are blank", () => {
  const parsed = normalizeWechatPaymentConfigPatch(
    {
      enabled: true,
      notifyUrl: "https://www.codetutor.cn/api/payment/wechat/notify",
      merchantPrivateKeyPem: "",
      apiV3Key: "",
      wechatpayPublicKeyPem: "",
    },
    {
      enabled: true,
      appId: "wx123",
      mchId: "1900000001",
      notifyUrl: "https://old.example.com/api/payment/wechat/notify",
      merchantSerialNo: "SERIAL123",
      merchantPrivateKeyConfigured: true,
      apiV3KeyConfigured: true,
      wechatpayPublicKeyId: "PUB_KEY_ID_123",
      wechatpayPublicKeyConfigured: true,
    },
  )

  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.data.notifyUrl, "https://www.codetutor.cn/api/payment/wechat/notify")
    assert.equal(parsed.data.merchantPrivateKeyPem, null)
    assert.equal(parsed.data.apiV3Key, null)
    assert.equal(parsed.data.wechatpayPublicKeyPem, null)
  }
})

test("wechat payment settings patch can disable payment without clearing stored secrets", () => {
  const parsed = normalizeWechatPaymentConfigPatch(
    {
      enabled: false,
      merchantPrivateKeyPem: "",
      apiV3Key: "",
      wechatpayPublicKeyPem: "",
    },
    {
      enabled: true,
      appId: "wx123",
      mchId: "1900000001",
      notifyUrl: "https://www.codetutor.cn/api/payment/wechat/notify",
      merchantSerialNo: "SERIAL123",
      merchantPrivateKeyConfigured: true,
      apiV3KeyConfigured: true,
      wechatpayPublicKeyId: "PUB_KEY_ID_123",
      wechatpayPublicKeyConfigured: true,
    },
  )

  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.data.enabled, false)
    assert.equal(parsed.data.merchantPrivateKeyPem, null)
    assert.equal(parsed.data.apiV3Key, null)
    assert.equal(parsed.data.wechatpayPublicKeyPem, null)
  }
})

test("wechat payment response verification requires signature headers and matching public key id", () => {
  assert.throws(
    () => validateWechatPayResponseHeaders({
      headers: new Headers(),
      expectedWechatpayPublicKeyId: "PUB_KEY_ID_123",
    }),
    /缺少签名头/,
  )

  assert.throws(
    () => validateWechatPayResponseHeaders({
      headers: new Headers({
        "Wechatpay-Signature": "sig",
        "Wechatpay-Timestamp": "1714051200",
        "Wechatpay-Nonce": "nonce",
        "Wechatpay-Serial": "OTHER_KEY",
      }),
      expectedWechatpayPublicKeyId: "PUB_KEY_ID_123",
    }),
    /公钥 ID 不匹配/,
  )
})

test("wechat trade state maps local terminal statuses", () => {
  assert.equal(
    normalizeWechatTradeStateForOrder({
      tradeState: "CLOSED",
      localExpiresAt: "2026-04-26T10:00:00.000Z",
      now: "2026-04-26T09:00:00.000Z",
    }),
    "closed",
  )
  assert.equal(
    normalizeWechatTradeStateForOrder({
      tradeState: "PAYERROR",
      localExpiresAt: "2026-04-26T10:00:00.000Z",
      now: "2026-04-26T09:00:00.000Z",
    }),
    "failed",
  )
  assert.equal(
    normalizeWechatTradeStateForOrder({
      tradeState: "USERPAYING",
      localExpiresAt: "2026-04-26T10:00:00.000Z",
      now: "2026-04-26T10:00:01.000Z",
    }),
    "expired",
  )
  assert.equal(
    normalizeWechatTradeStateForOrder({
      tradeState: "NOTPAY",
      localExpiresAt: "2026-04-26T10:00:00.000Z",
      now: "2026-04-26T09:00:00.000Z",
    }),
    null,
  )
})

test("payment completion is implemented through a row-locking database RPC", () => {
  const migration = readFileSync("supabase/migrations/035_harden_payment_order_completion.sql", "utf8")
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.complete_paid_payment_order/)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /IF v_order\.status = 'paid'/)
})
