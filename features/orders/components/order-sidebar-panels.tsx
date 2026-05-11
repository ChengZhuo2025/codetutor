"use client"

import { HistorySidebarPanels } from "@/features/history/components/history-sidebar-panels"
import { orderFaqItems } from "@/features/orders/data/orders-data"

export function OrderSidebarPanels() {
  return <HistorySidebarPanels faqItems={orderFaqItems} />
}
