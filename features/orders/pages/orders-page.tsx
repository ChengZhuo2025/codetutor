"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { CheckCircle2, Crown, Loader2, MessageCircle, RefreshCw } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell"
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { ROUTES } from "@/constants/routes"
import { requestData } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import type {
  PaymentOrderListResponseData,
  PaymentOrderResponseData,
  PaymentOrderStatus,
} from "@/lib/api/contracts/payment"
import type { ApiRequestState } from "@/types/api"
import type { SubscriptionSnapshot } from "@/types/profile"
import { OrderList } from "@/features/orders/components/order-list"
import { OrderSidebarPanels } from "@/features/orders/components/order-sidebar-panels"

const ORDER_PAGE_SIZE = 10

const EMPTY_SUBSCRIPTION_SNAPSHOT: SubscriptionSnapshot = {
  planName: "免费版",
  planPriceLabel: "¥0.00",
  billingCycleLabel: "按需升级",
  expiresAt: "无期限",
  remainingDays: 0,
  quotaLabel: "选择套餐后立即开通订阅权益",
  renewalHint: "你可以选择适合当前学习节奏的套餐。",
  primaryActionLabel: "订阅套餐",
  secondaryActionLabel: "查看套餐",
}

type OrderFilter = "all" | "pending" | PaymentOrderStatus

const ORDER_FILTERS: Array<{
  id: OrderFilter
  label: string
  getCount: (summary: PaymentOrderListResponseData["summary"]) => number
}> = [
  { id: "all", label: "全部", getCount: (summary) => summary.totalCount },
  { id: "pending", label: "待支付", getCount: (summary) => summary.pendingCount },
  { id: "paid", label: "已支付", getCount: (summary) => summary.paidCount },
  { id: "closed", label: "已取消", getCount: (summary) => summary.closedCount },
  { id: "expired", label: "已过期", getCount: (summary) => summary.expiredCount },
  { id: "failed", label: "失败", getCount: (summary) => summary.failedCount },
]

function getApiStatus(filter: OrderFilter) {
  if (filter === "all" || filter === "pending") return "all"
  return filter
}

function filterPending(items: PaymentOrderResponseData[], filter: OrderFilter) {
  if (filter !== "pending") return items
  return items.filter((item) => item.status === "created" || item.status === "prepay_created")
}

function getEmptyCopy(filter: OrderFilter) {
  if (filter === "pending") return { title: "没有待支付订单", description: "创建订阅订单后，未完成支付的记录会出现在这里。" }
  if (filter === "paid") return { title: "还没有已支付订单", description: "完成套餐支付后，这里会展示订阅购买记录。" }
  if (filter === "closed") return { title: "没有已取消订单", description: "主动取消的待支付订单会出现在这里，并支持删除记录。" }
  if (filter === "expired") return { title: "没有已过期订单", description: "超过支付有效期的订单会自动归入已过期状态。" }
  if (filter === "failed") return { title: "没有失败订单", description: "支付异常订单会出现在这里，便于后续重新购买。" }
  return { title: "还没有订单", description: "订阅或续费套餐后，这里会展示你的订单记录。" }
}

export function OrdersPage() {
  const toast = useAppToast()
  const [state, setState] = useState<ApiRequestState<PaymentOrderListResponseData>>({ status: "loading" })
  const [currentPage, setCurrentPage] = useState(1)
  const [currentFilter, setCurrentFilter] = useState<OrderFilter>("all")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [payingOrder, setPayingOrder] = useState<PaymentOrderResponseData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)

  const loadOrders = useCallback(async (filter: OrderFilter, page = 1, append = false) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ORDER_PAGE_SIZE),
      status: getApiStatus(filter),
    })
    const data = await requestData<PaymentOrderListResponseData>(`/payment/orders?${params.toString()}`)
    setCurrentPage(page)
    setState((current) => {
      const nextItems = filterPending(data.items, filter)
      if (!append || current.status !== "success") {
        return { status: "success", data: { ...data, items: nextItems } }
      }
      return {
        status: "success",
        data: {
          ...data,
          items: [...current.data.items, ...nextItems],
        },
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        await loadOrders(currentFilter, 1, false)
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "订单加载失败" })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [currentFilter, loadOrders])

  useEffect(() => {
    if (!payingOrder?.codeUrl || payingOrder.codeUrl.includes("<form")) {
      setQrDataUrl(null)
      return
    }
    void QRCode.toDataURL(payingOrder.codeUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrDataUrl)
  }, [payingOrder])

  const pageSummary = state.status === "success" ? state.data.summary : null
  const pageItems = state.status === "success" ? state.data.items : []
  const pageTotal = state.status === "success" ? state.data.total : 0
  const pageHasMore = state.status === "success" ? state.data.hasMore : false
  const emptyCopy = useMemo(() => getEmptyCopy(currentFilter), [currentFilter])

  const reloadFirstPage = async () => loadOrders(currentFilter, 1, false)

  const handleContinuePay = async (order: PaymentOrderResponseData) => {
    setIsMutating(true)
    try {
      const next = await requestData<PaymentOrderResponseData>(`/payment/orders/${order.orderNo}/continue`, { method: "POST" })
      if (next.status !== "created" && next.status !== "prepay_created") {
        toast.info("订单状态已更新")
        await reloadFirstPage()
        return
      }
      if (next.paymentChannel === "alipay" && next.codeUrl?.includes("<form")) {
        const container = document.createElement("div")
        container.innerHTML = next.codeUrl
        document.body.appendChild(container)
        const form = container.querySelector("form") as HTMLFormElement | null
        form?.submit()
        toast.info("正在跳转到支付宝")
        return
      }
      if (!next.codeUrl) {
        toast.error("支付二维码暂未生成，请稍后重试")
        return
      }
      setPayingOrder(next)
      setPayDialogOpen(true)
      await reloadFirstPage()
    } catch (error) {
      if (order.paymentChannel === "alipay" && order.codeUrl?.includes("<form")) {
        const container = document.createElement("div")
        container.innerHTML = order.codeUrl
        document.body.appendChild(container)
        const form = container.querySelector("form") as HTMLFormElement | null
        form?.submit()
        toast.info("正在跳转到支付宝")
        return
      }
      toast.error(error instanceof Error ? error.message : "继续支付失败")
    } finally {
      setIsMutating(false)
    }
  }

  const handleSync = async (order: PaymentOrderResponseData) => {
    setIsMutating(true)
    try {
      const next = await requestData<PaymentOrderResponseData>(`/payment/orders/${order.orderNo}/sync`, { method: "POST" })
      toast.success(next.status === "paid" ? "支付成功" : "订单状态已刷新")
      await reloadFirstPage()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "订单状态同步失败")
      await reloadFirstPage()
    } finally {
      setIsMutating(false)
    }
  }

  const handlePaymentDialogOpenChange = (open: boolean) => {
    setPayDialogOpen(open)
    if (!open) {
      setPayingOrder(null)
      setQrDataUrl(null)
      void reloadFirstPage()
    }
  }

  const handleCancel = async (order: PaymentOrderResponseData) => {
    setIsMutating(true)
    try {
      await requestData<PaymentOrderResponseData>(`/payment/orders/${order.orderNo}/cancel`, { method: "POST" })
      toast.success("订单已取消")
      await reloadFirstPage()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "取消订单失败")
    } finally {
      setIsMutating(false)
    }
  }

  const handleDelete = async (order: PaymentOrderResponseData) => {
    setIsMutating(true)
    try {
      await requestData<PaymentOrderResponseData>(`/payment/orders/${order.orderNo}`, { method: "DELETE" })
      toast.success("订单记录已删除")
      await reloadFirstPage()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除订单失败")
    } finally {
      setIsMutating(false)
    }
  }

  const handleLoadMore = async () => {
    if (state.status !== "success" || isLoadingMore || !pageHasMore) return
    setIsLoadingMore(true)
    try {
      await loadOrders(currentFilter, currentPage + 1, true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载更多订单失败")
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <AppShell
      workspacePage="history"
      mobileTitle="订阅记录"
      mobileSubtitle={pageSummary ? `共 ${pageSummary.totalCount} 条订单` : "订阅与支付记录"}
      asideLabel="订单帮助"
      renderSidebar={({ mobile }) => <WorkspaceSidebar activeHref={ROUTES.orders} mobile={mobile} />}
      renderAside={() => <div className="p-5"><OrderSidebarPanels /></div>}
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      <Dialog open={payDialogOpen} onOpenChange={handlePaymentDialogOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-[520px]">
          <div className={cn("border-b px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MessageCircle className="h-5 w-5 text-brand" />
                微信扫码支付
              </DialogTitle>
              <DialogDescription>
                {payingOrder ? `订单 ${payingOrder.orderNo} 正在等待支付。` : "正在准备支付二维码。"}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-5 pb-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-border/60 bg-white p-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="微信支付二维码" className="h-full w-full" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">套餐</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{payingOrder?.planName ?? "读取中"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">金额</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    ¥{payingOrder ? (payingOrder.amountCents / 100).toFixed(2) : "--"}
                  </p>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">
                  请使用微信扫码完成支付，支付后可点击刷新状态确认订阅权益。
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className={USER_PANEL_OUTLINE_BUTTON_CLASS}
                onClick={() => handlePaymentDialogOpenChange(false)}
              >
                关闭
              </Button>
              {payingOrder ? (
                <Button
                  type="button"
                  className={USER_BUTTON_PRIMARY_CLASS}
                  disabled={isMutating}
                  onClick={() => handleSync(payingOrder)}
                >
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  刷新状态
                </Button>
              ) : null}
            </div>
            {payingOrder?.status === "paid" ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                支付成功，订阅权益已开通。
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">订阅记录</h1>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                查看订阅订单，继续支付待支付订单，或清理已取消记录。
              </p>
            </div>
            <SubscriptionDetailDialog subscription={EMPTY_SUBSCRIPTION_SNAPSHOT}>
              <Button
                type="button"
                className={cn("w-full sm:w-auto", USER_BUTTON_PRIMARY_CLASS)}
                aria-label="打开套餐订阅与续费"
              >
                <Crown className="h-4 w-4" />
                订阅套餐
              </Button>
            </SubscriptionDetailDialog>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
            {pageSummary ? (
              <div className="flex flex-wrap gap-2">
                {ORDER_FILTERS.map((filter) => {
                  const active = currentFilter === filter.id
                  return (
                    <Button
                      key={filter.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentFilter(filter.id)
                        setState({ status: "loading" })
                      }}
                      className={cn("rounded-full px-4", active ? USER_BUTTON_PRIMARY_CLASS : USER_BUTTON_SECONDARY_CLASS)}
                    >
                      {filter.label}
                      <span className="text-xs">{filter.getCount(pageSummary)}</span>
                    </Button>
                  )
                })}
              </div>
            ) : null}

            {state.status === "loading" ? (
              <StatePanel status="loading" title="正在加载订单" description="正在同步你的订阅与支付记录，请稍候。" />
            ) : state.status === "error" ? (
              <StatePanel status="error" title="订单加载失败" description={state.message} actionLabel="重新加载" onAction={() => window.location.reload()} />
            ) : (
              <OrderList
                items={pageItems}
                total={pageTotal}
                hasMore={pageHasMore}
                isMutating={isMutating}
                isLoadingMore={isLoadingMore}
                emptyTitle={emptyCopy.title}
                emptyDescription={emptyCopy.description}
                emptyAction={
                  <SubscriptionDetailDialog subscription={EMPTY_SUBSCRIPTION_SNAPSHOT}>
                    <Button type="button" className={USER_BUTTON_PRIMARY_CLASS}>
                      订阅套餐
                    </Button>
                  </SubscriptionDetailDialog>
                }
                onContinuePay={handleContinuePay}
                onSync={handleSync}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onLoadMore={handleLoadMore}
              />
            )}
          </div>
        </div>
      </main>
    </AppShell>
  )
}
