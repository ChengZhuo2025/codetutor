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
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        danger: 'border-destructive/20 bg-destructive/10 text-destructive',
        info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        primary: 'border-primary/20 bg-primary/10 text-primary',
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
