"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  wrapperClassName?: string
  iconClassName?: string
}

function SearchInput({
  className,
  wrapperClassName,
  iconClassName,
  ...props
}: SearchInputProps) {
  return (
    <div data-slot="search-input-wrapper" className={cn("relative flex-1 min-w-32 max-w-md", wrapperClassName)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground",
          iconClassName,
        )}
        aria-hidden
      />
      <Input type="search" className={cn("h-9 bg-surface-2 pl-8", className)} {...props} />
    </div>
  )
}

export { SearchInput }
