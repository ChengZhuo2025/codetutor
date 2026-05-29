import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap !rounded-full text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[oklch(0.72_0.01_270)] disabled:text-white/78 disabled:shadow-none disabled:saturate-0 disabled:opacity-100 dark:disabled:bg-[oklch(0.30_0.24_270)] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 [&_svg]:text-current outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-brand text-white shadow-[0_20px_54px_-28px_rgba(98,92,255,0.42)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.66_0.24_270)] active:translate-y-0 focus-visible:ring-brand/35 dark:bg-brand dark:text-white dark:shadow-[0_24px_60px_-30px_rgba(116,102,255,0.28)] dark:hover:bg-[oklch(0.78_0.28_270)] dark:[&_svg]:text-white [&_svg]:text-white',
        destructive:
          'border border-transparent bg-[oklch(0.52_0.19_26)] text-white shadow-[0_18px_48px_-28px_rgba(220,38,38,0.36)] hover:-translate-y-0.5 hover:bg-[oklch(0.56_0.2_26)] active:translate-y-0 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-[oklch(0.48_0.17_26)] dark:text-white dark:shadow-[0_22px_52px_-30px_rgba(127,29,29,0.5)] dark:hover:bg-[oklch(0.52_0.18_26)]',
        destructiveSoft:
          'border border-destructive/10 bg-destructive/10 text-destructive shadow-[0_14px_36px_-28px_rgba(220,38,38,0.18)] hover:-translate-y-0.5 hover:bg-destructive/12 hover:border-destructive/15 hover:text-destructive active:translate-y-0 focus-visible:ring-destructive/25 dark:border-destructive/50 dark:bg-destructive/60 dark:text-white dark:shadow-[0_16px_42px_-30px_rgba(220,38,38,0.22)] dark:hover:bg-destructive/70 dark:hover:text-white dark:[&_svg]:text-white',
        outline:
          'border border-transparent bg-[oklch(0.70_0.30_230)] text-white shadow-[0_16px_42px_-32px_rgba(88,70,170,0.24)] hover:-translate-y-0.5 hover:bg-[oklch(0.75_0.30_230)] active:translate-y-0 dark:border-transparent dark:bg-[oklch(0.40_0.024_270)] dark:text-white dark:shadow-[0_20px_48px_-32px_rgba(0,0,0,0.42)] dark:hover:bg-[oklch(0.45_0.024_270)]',
        secondary:
          'border border-transparent bg-[oklch(0.70_0.30_230)] text-white shadow-[0_16px_42px_-32px_rgba(88,70,170,0.24)] hover:-translate-y-0.5 hover:bg-[oklch(0.75_0.30_230)] active:translate-y-0 dark:border-transparent dark:bg-[oklch(0.40_0.024_270)] dark:text-white dark:shadow-[0_20px_48px_-32px_rgba(0,0,0,0.42)] dark:hover:bg-[oklch(0.45_0.024_270)]',
        ghost:
          'hover:bg-muted hover:text-foreground dark:hover:bg-primary/15',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 md:h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 md:h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 md:h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
