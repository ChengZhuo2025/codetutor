"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const EMPTY_SENTINEL = "__ct_select_empty__"

export type SimpleSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SimpleSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SimpleSelectOption[]
  placeholder?: string
  disabled?: boolean
  id?: string
  triggerClassName?: string
  contentClassName?: string
}

function toRadixValue(value: string) {
  return value === "" ? EMPTY_SENTINEL : value
}

function fromRadixValue(value: string) {
  return value === EMPTY_SENTINEL ? "" : value
}

function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  triggerClassName,
  contentClassName,
}: SimpleSelectProps) {
  return (
    <Select
      value={toRadixValue(value)}
      onValueChange={(next) => onValueChange(fromRadixValue(next))}
      disabled={disabled ?? options.length === 0}
    >
      <SelectTrigger id={id} className={cn("h-10 w-full min-w-0 shadow-none", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={toRadixValue(option.value)} value={toRadixValue(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { SimpleSelect }
