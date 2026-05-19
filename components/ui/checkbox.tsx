"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  inputClassName?: string
}

function Checkbox({ className, inputClassName, ...props }: CheckboxProps) {
  return (
    <span
      data-slot="checkbox"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded border border-border bg-muted/45 text-primary transition-[background-color,border-color,box-shadow] has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        className={cn("peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed", inputClassName)}
        {...props}
      />
      <Check className="pointer-events-none size-3 opacity-0 transition-opacity peer-checked:opacity-100" aria-hidden />
    </span>
  )
}

type CheckboxFieldProps = Omit<React.ComponentProps<"label">, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  name?: string
  value?: string
  description?: React.ReactNode
  inputClassName?: string
}

function CheckboxField({
  className,
  children,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  name,
  value,
  description,
  inputClassName,
  ...props
}: CheckboxFieldProps) {
  return (
    <label
      data-slot="checkbox-field"
      className={cn(
        "flex min-h-10 items-start gap-2 rounded-md border border-border bg-muted/25 px-3 py-2.5 text-sm text-foreground transition-[background-color,border-color,box-shadow] hover:bg-muted/35 has-[:checked]:border-primary/45 has-[:checked]:bg-primary/8 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
      {...props}
    >
      <Checkbox
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        value={value}
        inputClassName={inputClassName}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="block leading-5">{children}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  )
}

function CheckboxGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="checkbox-group" className={cn("grid gap-2", className)} {...props} />
}

export { Checkbox, CheckboxField, CheckboxGroup }
