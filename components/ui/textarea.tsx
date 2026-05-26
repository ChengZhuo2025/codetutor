import * as React from 'react'

import { cn } from '@/lib/utils'

type TextareaProps = React.ComponentProps<'textarea'> & {
  variant?: 'default' | 'code' | 'composer'
}

function Textarea({ className, variant = 'default', ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-md border bg-surface-2 px-3 py-2 text-base text-foreground shadow-xs outline-none read-only:bg-muted/55 read-only:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        '[&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_var(--color-surface-2)]',
        variant === 'code' && 'min-h-40 font-mono text-sm',
        variant === 'composer' &&
          'scrollbar-none min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
