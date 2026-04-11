"use client"

import { useId, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { adminChartTooltipContentStyle, adminChartTooltipLabelStyle } from "./admin-chart-tooltip"

export type AdminAreaChartDatum = Record<string, string | number>

type AdminAreaChartProps = {
  data: AdminAreaChartDatum[]
  xKey: string
  yKey: string
  yDomain?: [number, number]
  name?: string
  /** Accessible description for the chart region */
  ariaLabel?: string
}

export function AdminAreaChart({ data, xKey, yKey, yDomain, name, ariaLabel }: AdminAreaChartProps) {
  const reactId = useId()
  const gradientId = useMemo(() => `admin-area-grad-${reactId.replace(/:/g, "")}`, [reactId])
  const stroke = "var(--admin-dashboard-chart)"

  return (
    <div className="h-full w-full min-h-[176px]" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={yDomain ?? ["auto", "auto"]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={adminChartTooltipContentStyle}
            labelStyle={adminChartTooltipLabelStyle}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            name={name ?? yKey}
            stroke={stroke}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
