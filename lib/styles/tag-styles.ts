/**
 * 统一标签样式配置
 * 使用 --chart-1 到 --chart-5 颜色变量
 */

export const TAG_VARIANTS = {
  // 基础状态
  neutral: "border-border bg-muted/60 text-muted-foreground",
  outline: "border-border bg-background text-foreground",
  
  // 使用chart颜色的状态
  chart1: "border-chart-1/20 bg-chart-1/10 text-chart-1",
  chart2: "border-chart-2/20 bg-chart-2/10 text-chart-2",
  chart3: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  chart4: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  chart5: "border-chart-5/20 bg-chart-5/10 text-chart-5",
  
  // 语义化状态（映射到chart颜色）
  success: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  warning: "border-chart-2/20 bg-chart-2/10 text-chart-2",
  danger: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  info: "border-chart-5/20 bg-chart-5/10 text-chart-5",
  primary: "border-chart-1/20 bg-chart-1/10 text-chart-1",
} as const

export type TagVariant = keyof typeof TAG_VARIANTS

/**
 * 管理后台专用标签样式映射
 */
export const ADMIN_TAG_STYLES = {
  // 通用色调
  tone: {
    neutral: TAG_VARIANTS.neutral,
    outline: TAG_VARIANTS.outline,
    success: TAG_VARIANTS.success,
    warning: TAG_VARIANTS.warning,
    danger: TAG_VARIANTS.danger,
    info: TAG_VARIANTS.info,
    primary: TAG_VARIANTS.primary,
    brand: TAG_VARIANTS.primary,
  },

  // 反馈状态
  feedback: {
    submitted: TAG_VARIANTS.chart2,    // 待处理 - chart2 (黄色/琥珀色)
    in_review: TAG_VARIANTS.chart5,    // 处理中 - chart5 (蓝色)
    replied: TAG_VARIANTS.chart3,      // 已解决 - chart3 (绿色)
    closed: TAG_VARIANTS.neutral,      // 已关闭 - 中性
  },
  
  // 优先级
  priority: {
    high: TAG_VARIANTS.chart4,         // 高优先级 - chart4 (红色)
    medium: TAG_VARIANTS.chart2,       // 中优先级 - chart2 (黄色)
    low: TAG_VARIANTS.neutral,         // 低优先级 - 中性
  },
  
  // 学习计划状态
  learningStatus: {
    active: TAG_VARIANTS.chart5,       // 进行中 - chart5 (蓝色)
    interrupted: TAG_VARIANTS.chart2,  // 已中断 - chart2 (黄色)
    completed: TAG_VARIANTS.chart3,    // 已完成 - chart3 (绿色)
    abandoned: TAG_VARIANTS.chart4,    // 已放弃 - chart4 (红色)
    archived: TAG_VARIANTS.neutral,    // 已归档 - 中性
  },
  
  // AI相关状态
  aiStatus: {
    enabled: TAG_VARIANTS.chart3,      // 启用 - chart3 (绿色)
    disabled: TAG_VARIANTS.neutral,    // 禁用 - 中性
    testing: TAG_VARIANTS.chart5,      // 测试中 - chart5 (蓝色)
    error: TAG_VARIANTS.chart4,        // 错误 - chart4 (红色)
  },
  
  // 订单状态
  orderStatus: {
    pending: TAG_VARIANTS.chart2,      // 待支付 - chart2 (黄色)
    paid: TAG_VARIANTS.chart3,         // 已支付 - chart3 (绿色)
    completed: TAG_VARIANTS.chart3,    // 已完成 - chart3 (绿色)
    cancelled: TAG_VARIANTS.chart4,    // 已取消 - chart4 (红色)
    refunded: TAG_VARIANTS.neutral,    // 已退款 - 中性
  },
  
  // 通用启用状态
  enabled: {
    true: TAG_VARIANTS.chart3,         // 启用 - chart3 (绿色)
    false: TAG_VARIANTS.neutral,       // 禁用 - 中性
  },

  // 管理员角色
  role: {
    super_admin: TAG_VARIANTS.chart4,
    support_admin: TAG_VARIANTS.chart3,
    ops_admin: TAG_VARIANTS.primary,
    ai_ops_admin: TAG_VARIANTS.chart5,
  },

  // 管理员账号状态
  adminAccountStatus: {
    active: TAG_VARIANTS.chart3,
    inactive: TAG_VARIANTS.chart2,
    suspended: TAG_VARIANTS.chart4,
  },

  // 配置状态
  configurationStatus: {
    configured: TAG_VARIANTS.chart3,
    incomplete: TAG_VARIANTS.chart2,
  },

  // 订阅套餐状态
  subscriptionPlanStatus: {
    active: TAG_VARIANTS.chart3,
    inactive: TAG_VARIANTS.chart2,
    purchasable: TAG_VARIANTS.chart5,
    display_only: TAG_VARIANTS.neutral,
    archived: TAG_VARIANTS.chart4,
    highlight: TAG_VARIANTS.primary,
  },
} as const

/**
 * 获取标签样式类名
 */
export function getTagClassName(variant: TagVariant): string {
  return TAG_VARIANTS[variant]
}

/**
 * 获取管理后台标签样式类名
 */
export function getAdminTagStyle(
  category: keyof typeof ADMIN_TAG_STYLES,
  value: string | boolean
): string {
  const styles = ADMIN_TAG_STYLES[category]
  const key = typeof value === 'boolean' ? String(value) : value
  
  if (key in styles) {
    return styles[key as keyof typeof styles]
  }

  return TAG_VARIANTS.neutral
}
