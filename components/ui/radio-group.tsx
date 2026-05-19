"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type RadioGroupProps = React.ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
  name: string
}

const RadioGroupContext = React.createContext<Pick<RadioGroupProps, "value" | "onValueChange" | "name"> | null>(null)

function RadioGroup({ className, value, onValueChange, name, ...props }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div data-slot="radio-group" className={cn("grid gap-2", className)} role="radiogroup" {...props} />
    </RadioGroupContext.Provider>
  )
}

type RadioFieldProps = Omit<React.ComponentProps<"label">, "onChange"> & {
  value: string
  description?: React.ReactNode
  disabled?: boolean
}

function RadioField({ className, children, value, description, disabled, ...props }: RadioFieldProps) {
  const context = React.useContext(RadioGroupContext)
  const checked = context?.value === value

  return (
    <label
      data-slot="radio-field"
      className={cn(
        "flex min-h-10 items-start gap-2 rounded-md border border-border bg-muted/25 px-3 py-2.5 text-sm text-foreground transition-[background-color,border-color,box-shadow] hover:bg-muted/35 has-[:checked]:border-primary/45 has-[:checked]:bg-primary/8 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
      {...props}
    >
      <span className="relative mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-muted/45 transition-[background-color,border-color,box-shadow] has-[:checked]:border-primary has-[:checked]:bg-primary has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50">
        <input
          type="radio"
          name={context?.name}
          value={value}
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            if (event.target.checked) {
              context?.onValueChange?.(value)
            }
          }}
        />
        <span className="pointer-events-none size-1.5 rounded-full bg-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-5">{children}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  )
}

export { RadioGroup, RadioField }
