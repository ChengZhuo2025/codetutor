"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { requestData } from "@/lib/api/client"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import type { PaymentOrderResponseData, SubscriptionMeResponseData } from "@/lib/api/contracts/payment"

export function PaymentReturnHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useAppToast()

  useEffect(() => {
    const paymentReturn = searchParams.get("paymentReturn")
    const orderNo = searchParams.get("orderNo")
    const paymentChannel = searchParams.get("paymentChannel")

    if (paymentReturn === "1" && orderNo) {
      void requestData<PaymentOrderResponseData>(`/payment/orders/${orderNo}/sync`, {
        method: "POST",
      })
        .then((order) => {
          if (order.status === "paid") {
            void requestData<SubscriptionMeResponseData>("/subscription/me").then(() => {
              toast.success("支付成功", "订阅权益已开通")
            })
          } else if (order.status === "expired") {
            toast.error("支付超时", "订单已过期，请重新创建订单")
          } else if (order.status === "closed") {
            toast.info("订单已关闭", "如需继续，请重新创建订单")
          }
        })
        .catch(() => {
          toast.error("同步失败", "支付状态同步失败，请稍后刷新页面")
        })

      const url = new URL(window.location.href)
      url.searchParams.delete("paymentReturn")
      url.searchParams.delete("orderNo")
      url.searchParams.delete("paymentChannel")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, router, toast])

  return null
}
