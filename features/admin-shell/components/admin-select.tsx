"use client"

import { SimpleSelect } from "@/components/ui/simple-select"
import { cn } from "@/lib/utils"

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
  return (
    <SimpleSelect
      id={id}
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled ?? options.length === 0}
      triggerClassName={cn("h-9 w-fit max-w-full shrink-0 min-w-[9rem]", triggerClassName)}
      contentClassName={contentClassName}
    />
  )
}
