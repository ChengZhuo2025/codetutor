import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function FormField({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="form-field" className={cn("space-y-1.5", className)} {...props} />
}

function FormLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label> & {
  required?: boolean
}) {
  return (
    <Label data-slot="form-label" className={cn("text-sm font-medium text-foreground", className)} {...props}>
      <span>{children}</span>
      {required ? <span className="text-destructive" aria-hidden>*</span> : null}
    </Label>
  )
}

function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="form-description"
      className={cn("text-xs leading-5 text-muted-foreground", className)}
      {...props}
    />
  )
}

function FormMessage({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="form-message"
      className={cn("text-xs leading-5 text-destructive", className)}
      {...props}
    />
  )
}

export { FormField, FormLabel, FormDescription, FormMessage }
