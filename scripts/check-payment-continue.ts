import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("refreshWechatNativeOrderPrepay closes the existing order before creating a new prepay", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fnStart = source.indexOf("async function refreshWechatNativeOrderPrepay(")
  assert.ok(fnStart >= 0, "refreshWechatNativeOrderPrepay 未找到")
  const fnBody = source.slice(fnStart, source.indexOf("\n}\n", fnStart))

  // 必须包含 close 调用（微信支付 v3 规范：重开同 out_trade_no 前需先关单）
  assert.match(fnBody, /\/v3\/pay\/transactions\/out-trade-no\/[^\s]*\/close/)
  // 必须包含重新创建 native 的调用
  assert.match(fnBody, /\/v3\/pay\/transactions\/native/)
  // close 一定在 native 之前调用（按出现顺序）
  const closeIndex = fnBody.indexOf("/close")
  const nativeIndex = fnBody.indexOf("/v3/pay/transactions/native")
  assert.ok(closeIndex >= 0 && nativeIndex >= 0)
  assert.ok(closeIndex < nativeIndex, "必须先 /close 旧单再 /native 重下")
})

test("refreshWechatNativeOrderPrepay tolerates ORDERNOTEXIST/ORDER_CLOSED on close call", () => {
  const source = readFileSync("server/modules/payments/service.ts", "utf8")
  const fnStart = source.indexOf("async function refreshWechatNativeOrderPrepay(")
  const fnBody = source.slice(fnStart, source.indexOf("\n}\n", fnStart))
  // 关单若失败需容忍“订单不存在”“订单已关闭”类错误继续推进，
  // 否则会在已关单场景下卡住用户。
  assert.match(fnBody, /ORDERNOTEXIST|ORDER_CLOSED|ignoreCloseError/)
})
