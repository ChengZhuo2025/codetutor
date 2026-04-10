"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Radix Select 不允许 item value 为空串，用占位符映射「全部」类选项 */
const EMPTY_SENTINEL = "__ct_admin_sel_empty__"

export type AdminSelectOption = { value: string; label: string }

export type AdminSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: AdminSelectOption[]
  placeholder?: string
  disabled?: boolean
  /** 与 `Label htmlFor` 对齐，便于可访问性与点击标签聚焦 */
  id?: string
  triggerClassName?: string
  contentClassName?: string
}

function toRadixOptions(options: AdminSelectOption[]) {
  return options.map((o) =>
    o.value === "" ? { radixValue: EMPTY_SENTINEL, label: o.label } : { radixValue: o.value, label: o.label },
  )
}

/**
 * 管理端筛选/分页用下拉：弹层使用主题 token（非系统原生灰色），触发器右侧箭头留白由 `SelectTrigger` 统一处理。
 */
export function AdminSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  triggerClassName,
  contentClassName,
}: AdminSelectProps) {
  const hasEmptyOption = options.some((o) => o.value === "")
  const radixValue = value === "" && hasEmptyOption ? EMPTY_SENTINEL : value
  const radixOptions = toRadixOptions(options)

  return (
    <Select
      value={radixValue}
      onValueChange={(next) => onValueChange(next === EMPTY_SENTINEL ? "" : next)}
      disabled={disabled ?? options.length === 0}
    >
      <SelectTrigger id={id} className={cn("h-9 w-fit max-w-full shrink-0 min-w-[9rem] shadow-none", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className={contentClassName}>
        {radixOptions.map((o) => (
          <SelectItem key={o.radixValue} value={o.radixValue}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
