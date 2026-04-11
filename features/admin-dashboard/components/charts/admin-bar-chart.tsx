"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  adminChartTooltipContentStyle,
  adminChartTooltipCursorProps,
  adminChartTooltipLabelStyle,
} from "./admin-chart-tooltip"

export type AdminBarChartDatum = Record<string, string | number>

type AdminBarChartProps = {
  data: AdminBarChartDatum[]
  xKey: string
  yKey: string
  name?: string
  ariaLabel?: string
}

export function AdminBarChart({ data, xKey, yKey, name, ariaLabel }: AdminBarChartProps) {
  const fill = "var(--admin-dashboard-chart)"

  return (
    <div className="h-full w-full min-h-[176px]" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={adminChartTooltipContentStyle}
            labelStyle={adminChartTooltipLabelStyle}
            cursor={adminChartTooltipCursorProps}
          />
          <Bar dataKey={yKey} name={name ?? yKey} fill={fill} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
