import test from "node:test"
import assert from "node:assert/strict"
import { createPublicKey, createSign } from "node:crypto"

import {
  buildAlipaySignedParams,
  verifyAlipayResponseSignature,
  verifyAlipaySignature,
} from "../server/modules/payments/alipay-crypto.ts"
import {
  normalizeAlipayPaymentConfigPatch,
  normalizeAlipayPaymentConfigInput,
  normalizeAlipayTradeStatusForOrder,
} from "../server/modules/payments/model.ts"
import {
  createAlipayNotifyPostHandler,
  createAlipayPrecreateOrderPostHandler,
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

test("buildAlipaySignedParams signs sorted RSA2 parameters", () => {
  const signed = buildAlipaySignedParams({
    params: {
      method: "alipay.trade.precreate",
      app_id: "2021000000000000",
      charset: "utf-8",
      sign_type: "RSA2",
      biz_content: JSON.stringify({ out_trade_no: "CT202605100001" }),
    },
    privateKeyPem: TEST_PRIVATE_KEY,
  })

  assert.equal(signed.sign_type, "RSA2")
  assert.equal(typeof signed.sign, "string")
  assert.equal(
    verifyAlipaySignature({
      params: signed,
      publicKeyPem: TEST_PUBLIC_KEY,
    }),
    true,
  )
  assert.equal(
    verifyAlipaySignature({
      params: { ...signed, app_id: "tampered" },
      publicKeyPem: TEST_PUBLIC_KEY,
    }),
    false,
  )
})

test("normalizeAlipayPaymentConfigInput requires complete enabled config", () => {
  const parsed = normalizeAlipayPaymentConfigInput({
    enabled: true,
    appId: "2021000000000000",
    notifyUrl: "https://www.codetutor.cn/api/payment/alipay/notify",
    appPrivateKeyPem: TEST_PRIVATE_KEY,
    alipayPublicKeyPem: TEST_PUBLIC_KEY,
  })

  assert.equal(parsed.ok, true)

  const invalid = normalizeAlipayPaymentConfigInput({
    enabled: true,
    appId: "2021000000000000",
  })
  assert.equal(invalid.ok, false)
})

test("normalizeAlipayPaymentConfigInput accepts Alipay console bare keys", () => {
  const barePrivateKey = TEST_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")
  const barePublicKey = TEST_PUBLIC_KEY
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "")

  const parsed = normalizeAlipayPaymentConfigInput({
    enabled: true,
    appId: "2021000000000000",
    notifyUrl: "https://www.codetutor.cn/api/payment/alipay/notify",
    appPrivateKeyPem: barePrivateKey,
    alipayPublicKeyPem: barePublicKey,
  })

  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.match(parsed.data.appPrivateKeyPem, /^-----BEGIN PRIVATE KEY-----/)
    assert.match(parsed.data.alipayPublicKeyPem, /^-----BEGIN PUBLIC KEY-----/)
  }
})

test("verifyAlipayResponseSignature validates gateway response payload only", () => {
  const responsePayload = {
    code: "10000",
    msg: "Success",
    out_trade_no: "CT202605100001",
    qr_code: "https://qr.alipay.com/example",
  }
  const signer = createSign("RSA-SHA256")
  signer.update(JSON.stringify(responsePayload), "utf8")
  signer.end()
  const signature = signer.sign(TEST_PRIVATE_KEY).toString("base64")

  assert.equal(
    verifyAlipayResponseSignature({
      responsePayload,
      signature,
      publicKeyPem: TEST_PUBLIC_KEY,
    }),
    true,
  )
  assert.equal(
    verifyAlipayResponseSignature({
      responsePayload: { ...responsePayload, qr_code: "tampered" },
      signature,
      publicKeyPem: TEST_PUBLIC_KEY,
    }),
    false,
  )
})

test("normalizeAlipayPaymentConfigPatch preserves configured secrets", () => {
  const parsed = normalizeAlipayPaymentConfigPatch(
    {
      enabled: true,
      appId: "2021000000000000",
      notifyUrl: "https://www.codetutor.cn/api/payment/alipay/notify",
    },
    {
      appPrivateKeyConfigured: true,
      alipayPublicKeyConfigured: true,
    },
  )

  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.data.appPrivateKeyPem, null)
    assert.equal(parsed.data.alipayPublicKeyPem, null)
  }
})

test("normalizeAlipayTradeStatusForOrder maps terminal statuses", () => {
  assert.equal(normalizeAlipayTradeStatusForOrder({
    tradeStatus: "TRADE_CLOSED",
    localExpiresAt: "2026-05-10T00:30:00.000Z",
    now: "2026-05-10T00:10:00.000Z",
  }), "closed")
  assert.equal(normalizeAlipayTradeStatusForOrder({
    tradeStatus: "WAIT_BUYER_PAY",
    localExpiresAt: "2026-05-10T00:30:00.000Z",
    now: "2026-05-10T00:10:00.000Z",
  }), null)
  assert.equal(normalizeAlipayTradeStatusForOrder({
    tradeStatus: "WAIT_BUYER_PAY",
    localExpiresAt: "2026-05-10T00:30:00.000Z",
    now: "2026-05-10T00:31:00.000Z",
  }), "expired")
})

test("alipay precreate route accepts dynamic plan codes", async () => {
  let capturedPlanCode = ""
  const handler = createAlipayPrecreateOrderPostHandler({
    getRequestUser: async () => ({ ok: true, userId: "user-1" }),
    createAlipayPrecreateOrder: async (_userId, input) => {
      capturedPlanCode = input.planCode
      return {
        orderNo: "CT202605100001",
        planCode: input.planCode,
        planName: "个人版",
        amountCents: 3900,
        currency: "CNY",
        status: "prepay_created",
        paymentChannel: "alipay",
        codeUrl: "https://qr.alipay.com/example",
        expiresAt: "2026-05-10T00:30:00.000Z",
        paidAt: null,
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
      }
    },
  })

  const res = await handler(new Request("http://localhost/api/payment/alipay/precreate-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planCode: "personal_monthly" }),
  }))

  assert.equal(res.status, 200)
  assert.equal(capturedPlanCode, "personal_monthly")
})

test("alipay notify returns success on verified callback", async () => {
  const handler = createAlipayNotifyPostHandler({
    handleAlipayPaymentNotify: async ({ form }) => {
      assert.equal(form.out_trade_no, "CT202605100001")
    },
  })

  const res = await handler(new Request("http://localhost/api/payment/alipay/notify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      out_trade_no: "CT202605100001",
      trade_status: "TRADE_SUCCESS",
    }).toString(),
  }))

  assert.equal(res.status, 200)
  assert.equal(await res.text(), "success")
})
