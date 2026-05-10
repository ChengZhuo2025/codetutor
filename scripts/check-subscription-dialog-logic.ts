import test from "node:test"
import assert from "node:assert/strict"

import {
  getPaymentOrderErrorMessage,
  getPlanActionState,
} from "../components/layout/subscription-detail-logic.ts"

test("free current plan shows current plan action instead of creating an order", () => {
  assert.deepEqual(
    getPlanActionState({
      planCode: null,
      isCurrent: true,
      isDowngrade: false,
      loadingPlanCode: null,
    }),
    {
      disabled: true,
      label: "当前套餐",
      variant: "current",
    },
  )
})

test("paid plan loading state is scoped to the clicked paid plan only", () => {
  assert.equal(
    getPlanActionState({
      planCode: "personal_monthly",
      isCurrent: false,
      isDowngrade: false,
      loadingPlanCode: "personal_monthly",
    }).label,
    "创建订单中…",
  )
  assert.equal(
    getPlanActionState({
      planCode: "pro_monthly",
      isCurrent: false,
      isDowngrade: false,
      loadingPlanCode: "personal_monthly",
    }).label,
    "升级套餐",
  )
})

test("payment config incomplete error is converted to a clear user-facing message", () => {
  assert.equal(
    getPaymentOrderErrorMessage(new Error("微信支付配置未启用或不完整。")),
    "当前暂未开放在线支付：微信支付配置未启用或不完整。请稍后再试，或联系管理员完成支付配置。",
  )
})

test("dynamic non-purchasable plans are disabled without relying on hardcoded plan codes", () => {
  assert.deepEqual(
    getPlanActionState({
      planCode: null,
      isCurrent: false,
      isDowngrade: false,
      loadingPlanCode: null,
    }),
    {
      disabled: true,
      label: "暂不可购买",
      variant: "unavailable",
    },
  )
})
