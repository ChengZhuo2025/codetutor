// 管理员壳层类型定义

export interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  children?: MenuItem[]
}

export interface AdminSession {
  adminAccountId: string
  userId: string
  displayName: string
  roles: string[]
  status: string
}
