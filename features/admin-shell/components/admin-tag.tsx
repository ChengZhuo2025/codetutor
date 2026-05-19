"use client"

import type { ComponentProps } from "react"
import { Badge } from "@/components/ui/badge"
import { getAdminTagStyle } from "@/lib/styles/tag-styles"
import { cn } from "@/lib/utils"

type AdminTagCategory = 
  | 'tone'
  | 'feedback'
  | 'priority'
  | 'learningStatus'
  | 'aiStatus'
  | 'orderStatus'
  | 'enabled'
  | 'role'
  | 'adminAccountStatus'
  | 'configurationStatus'
  | 'subscriptionPlanStatus'

type AdminTagProps = {
  /** 标签类别 */
  category: AdminTagCategory
  /** 标签值 */
  value: string | boolean
  /** 自定义类名 */
  className?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示为Badge组件 */
  asBadge?: boolean
  /** 子内容，如果提供则忽略value的显示 */
  children?: React.ReactNode
} & Omit<ComponentProps<'span'>, 'children'>

/**
 * 管理后台统一标签组件
 * 使用统一的chart颜色样式
 */
export function AdminTag({
  category,
  value,
  className,
  size = 'md',
  asBadge = true,
  children,
  ...props
}: AdminTagProps) {
  const styleClass = getAdminTagStyle(category, value)
  
  if (asBadge) {
    return (
      <Badge
        variant="neutral"
        size={size}
        className={cn(styleClass, className)}
        {...props}
      >
        {children || getDisplayText(category, value)}
      </Badge>
    )
  }
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 font-medium whitespace-nowrap",
        size === 'sm' && "px-2 py-0.5 text-[10px]",
        size === 'md' && "px-2 py-1 text-[11px]",
        size === 'lg' && "px-2.5 py-1 text-xs",
        styleClass,
        className
      )}
      {...props}
    >
      {children || getDisplayText(category, value)}
    </span>
  )
}

/**
 * 根据类别和值获取显示文本
 */
function getDisplayText(category: AdminTagCategory, value: string | boolean): string {
  if (typeof value === 'boolean') {
    return value ? '启用' : '禁用'
  }
  
  const textMap: Record<AdminTagCategory, Record<string, string>> = {
    feedback: {
      submitted: '待处理',
      in_review: '处理中',
      replied: '已解决',
      closed: '已关闭',
    },
    tone: {
      neutral: '默认',
      outline: '描边',
      success: '成功',
      warning: '警告',
      danger: '危险',
      info: '信息',
      primary: '主要',
      brand: '品牌',
    },
    priority: {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    },
    learningStatus: {
      active: '进行中',
      interrupted: '已中断',
      completed: '已完成',
      abandoned: '已放弃',
      archived: '已归档',
    },
    aiStatus: {
      enabled: '启用',
      disabled: '禁用',
      testing: '测试中',
      error: '错误',
    },
    orderStatus: {
      pending: '待支付',
      paid: '已支付',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款',
    },
    enabled: {
      true: '启用',
      false: '禁用',
    },
    role: {
      super_admin: '超级管理员',
      support_admin: '客服管理员',
      ops_admin: '运营管理员',
      ai_ops_admin: 'AI 管理管理员',
    },
    adminAccountStatus: {
      active: '启用',
      inactive: '停用',
      suspended: '冻结',
    },
    configurationStatus: {
      configured: '已配置',
      incomplete: '未完整配置',
    },
    subscriptionPlanStatus: {
      active: '上架',
      inactive: '下架',
      purchasable: '可购买',
      display_only: '仅展示',
      archived: '已归档',
      highlight: '推荐',
    },
  }
  
  return textMap[category]?.[value] || String(value)
}

/**
 * 反馈状态标签
 */
export function FeedbackStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="feedback" value={status} {...props} />
}

/**
 * 优先级标签
 */
export function PriorityTag({ priority, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { priority: string }) {
  return <AdminTag category="priority" value={priority} {...props} />
}

/**
 * 学习状态标签
 */
export function LearningStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="learningStatus" value={status} {...props} />
}

/**
 * AI状态标签
 */
export function AIStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="aiStatus" value={status} {...props} />
}

/**
 * 订单状态标签
 */
export function OrderStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="orderStatus" value={status} {...props} />
}

/**
 * 启用状态标签
 */
export function EnabledTag({ enabled, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { enabled: boolean }) {
  return <AdminTag category="enabled" value={enabled} {...props} />
}

/**
 * 角色标签
 */
export function RoleTag({ role, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { role: string }) {
  return <AdminTag category="role" value={role} {...props} />
}

/**
 * 管理员账号状态标签
 */
export function AdminAccountStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="adminAccountStatus" value={status} {...props} />
}

/**
 * 配置状态标签
 */
export function ConfigurationStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="configurationStatus" value={status} {...props} />
}

/**
 * 订阅套餐状态标签
 */
export function SubscriptionPlanStatusTag({ status, ...props }: Omit<AdminTagProps, 'category' | 'value'> & { status: string }) {
  return <AdminTag category="subscriptionPlanStatus" value={status} {...props} />
}
