"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { Loader2, ReceiptText } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
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
import { OrderList } from "@/features/orders/components/order-list"
import { OrderSidebarPanels } from "@/features/orders/components/order-sidebar-panels"

const ORDER_PAGE_SIZE = 10

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

  const handleContinuePay = (order: PaymentOrderResponseData) => {
    if (order.paymentChannel === "alipay" && order.codeUrl?.includes("<form")) {
      const container = document.createElement("div")
      container.innerHTML = order.codeUrl
      document.body.appendChild(container)
      const form = container.querySelector("form") as HTMLFormElement | null
      form?.submit()
      toast.info("正在跳转到支付宝")
      return
    }
    setPayingOrder(order)
  }

  const handleSync = async (order: PaymentOrderResponseData) => {
    setIsMutating(true)
    try {
      const next = await requestData<PaymentOrderResponseData>(`/payment/orders/${order.orderNo}/sync`, { method: "POST" })
      toast.success(next.status === "paid" ? "支付成功" : "订单状态已刷新")
      await reloadFirstPage()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "订单状态同步失败")
    } finally {
      setIsMutating(false)
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
      mobileTitle="订单管理"
      mobileSubtitle={pageSummary ? `共 ${pageSummary.totalCount} 条订单` : "订阅与支付记录"}
      asideLabel="订单帮助"
      renderSidebar={({ mobile }) => <WorkspaceSidebar activeHref={ROUTES.orders} mobile={mobile} />}
      renderAside={() => <div className="p-5"><OrderSidebarPanels /></div>}
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">订单管理</h1>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                查看订阅订单，继续支付待支付订单，或清理已取消记录。
              </p>
            </div>
            <ReceiptText className="hidden h-6 w-6 text-brand lg:block" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
            {payingOrder ? (
              <StatePanel
                status="success"
                title="继续支付"
                description={`订单 ${payingOrder.orderNo} 正在等待支付。`}
                compact
                extra={
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-2">
                      {qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="支付二维码" className="h-36 w-36" />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button type="button" variant="outline" onClick={() => setPayingOrder(null)}>
                      收起支付码
                    </Button>
                  </div>
                }
              />
            ) : null}

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
