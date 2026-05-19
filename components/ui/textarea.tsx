import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-md border bg-muted/45 px-3 py-2 text-base text-foreground shadow-xs transition-[background-color,border-color,box-shadow,color] outline-none read-only:bg-muted/55 read-only:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
