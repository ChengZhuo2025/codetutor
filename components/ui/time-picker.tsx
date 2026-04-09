"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Clock } from "lucide-react"
import {
  FLOATING_PANEL_CLASS,
  USER_PANEL_FIELD_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"

type TimePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

const hourOptions = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
)
const minuteOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
)

export function TimePicker({ id, value, onChange, className }: TimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const [selectedHour, selectedMinute] = useMemo(() => {
    const [hour = "09", minute = "00"] = value.split(":")
    return [hour.padStart(2, "0"), minute.padStart(2, "0")]
  }, [value])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  const updateTime = (nextHour: string, nextMinute: string, closeAfterSelect: boolean) => {
    onChange(`${nextHour}:${nextMinute}`)
    if (closeAfterSelect) {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg px-3 text-xs text-foreground transition-colors hover:bg-muted/65 focus-visible:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 dark:hover:bg-foreground/8",
          USER_PANEL_FIELD_CLASS,
          open && "border-brand/35 bg-muted/65 dark:bg-foreground/8",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="text-base font-medium tracking-[0.02em]">{value}</span>
        <Clock className="h-3.5 w-3.5 text-foreground/65" />
      </button>

      {open ? (
        <div className={cn(FLOATING_PANEL_CLASS, "absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl")}>
          <div className="grid grid-cols-[96px_96px] divide-x divide-border/70">
            <div className="max-h-64 overflow-y-auto scrollbar-none p-2">
              {hourOptions.map((hour) => {
                const active = hour === selectedHour

                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => updateTime(hour, selectedMinute, false)}
                    className={cn(
                      "mb-1 flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors last:mb-0",
                      active
                        ? "bg-brand text-brand-foreground"
                        : "text-foreground/75 hover:bg-muted/70 hover:text-foreground dark:hover:bg-foreground/8",
                    )}
                  >
                    {hour}
                  </button>
                )
              })}
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-none p-2">
              {minuteOptions.map((minute) => {
                const active = minute === selectedMinute

                return (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => updateTime(selectedHour, minute, true)}
                    className={cn(
                      "mb-1 flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors last:mb-0",
                      active
                        ? "bg-brand text-brand-foreground"
                        : "text-foreground/75 hover:bg-muted/70 hover:text-foreground dark:hover:bg-foreground/8",
                    )}
                  >
                    {minute}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
