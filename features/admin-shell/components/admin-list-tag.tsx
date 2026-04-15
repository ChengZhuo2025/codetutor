"use client"

import type { ComponentProps } from "react"
import type { VariantProps } from "class-variance-authority"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type AdminListTagProps = {
  className?: string
} & Omit<ComponentProps<"span">, "children"> & VariantProps<typeof badgeVariants> & {
    children: ComponentProps<"span">["children"]
  }

export function AdminListTag({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: AdminListTagProps) {
  return (
    <Badge
      variant={variant}
      size={size}
      className={cn("min-w-10 justify-center", className)}
      {...props}
    >
      {children}
    </Badge>
  )
}
