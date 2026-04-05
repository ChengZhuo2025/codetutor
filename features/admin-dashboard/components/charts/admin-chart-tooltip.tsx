"use client"

import type { CSSProperties } from "react"
import type { SVGProps } from "react"

/** Recharts 默认 cursor 为 #ccc，深色主题下过亮；改为品牌色低透明覆盖 */
export const adminChartTooltipCursorProps: SVGProps<SVGRectElement> = {
  stroke: "none",
  fill: "var(--primary)",
  fillOpacity: 0.07,
}

export const adminChartTooltipContentStyle: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: 12,
  color: "var(--popover-foreground)",
}

export const adminChartTooltipLabelStyle: CSSProperties = {
  color: "var(--foreground)",
  marginBottom: 4,
}
