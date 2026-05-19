import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted/60 text-muted-foreground',
        outline: 'border-border bg-background text-foreground',
        success: 'border-chart-3/20 bg-chart-3/10 text-chart-3',
        warning: 'border-chart-2/20 bg-chart-2/10 text-chart-2',
        danger: 'border-chart-4/20 bg-chart-4/10 text-chart-4',
        info: 'border-chart-5/20 bg-chart-5/10 text-chart-5',
        primary: 'border-chart-1/20 bg-chart-1/10 text-chart-1',
        // chart颜色变体
        chart1: 'border-chart-1/20 bg-chart-1/10 text-chart-1',
        chart2: 'border-chart-2/20 bg-chart-2/10 text-chart-2',
        chart3: 'border-chart-3/20 bg-chart-3/10 text-chart-3',
        chart4: 'border-chart-4/20 bg-chart-4/10 text-chart-4',
        chart5: 'border-chart-5/20 bg-chart-5/10 text-chart-5',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2 py-1 text-[11px]',
        lg: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  },
)

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />
}

export { Badge, badgeVariants }
