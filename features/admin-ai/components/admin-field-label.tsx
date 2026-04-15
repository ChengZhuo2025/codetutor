"use client"

import { CircleHelp } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type AdminFieldLabelProps = {
  htmlFor?: string
  label: string
  required?: boolean
  helpText?: string
}

export function AdminFieldLabel({
  htmlFor,
  label,
  required = false,
  helpText,
}: AdminFieldLabelProps) {
  return (
    <Label htmlFor={htmlFor}>
      <span>{label}</span>
      {required ? <span className="text-destructive">*</span> : null}
      {helpText ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-4 items-center justify-center text-muted-foreground"
              aria-label={`${label} 帮助`}
            >
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="max-w-[320px] whitespace-pre-line leading-relaxed">
            {helpText}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </Label>
  )
}
