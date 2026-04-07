# 侧边栏学习提醒优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将侧边栏学习提醒组件迁移到导航菜单下方，改为折叠卡片 + 列表行 + 弹框详情，并修复矛盾通知同时展示的问题。

**Architecture:** 三个文件的改动：(1) Provider 层添加同源通知互斥预处理，(2) 新建 `NotificationDetailDialog` 弹框组件，(3) 重构 `DashboardSidebar` 调整布局顺序并替换提醒区 UI。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui Dialog, Lucide icons

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `providers/workspace-sidebar-provider.tsx` | 添加同源通知互斥预处理函数 `dedupeNotifications` |
| `components/layout/notification-detail-dialog.tsx` | 新建：通知详情弹框（标题 + 内容 + 时间 + 操作按钮） |
| `components/layout/dashboard-sidebar.tsx` | 调整内容顺序，重构提醒区为折叠卡片 + 列表行 |

---

## Task 1: Provider 层添加通知去重逻辑

**Files:**
- Modify: `providers/workspace-sidebar-provider.tsx:1-25`（添加类型导入和去重函数）

- [ ] **Step 1: 添加去重函数**

在 `WorkspaceSidebarDataContextValue` 类型定义之前、文件顶部的 import 区末尾，添加以下函数：

```typescript
/**
 * 同源通知去重：按 source + 日期 分组，每组只保留最新一条（createdAt 最晚）
 * 解决"今天还没打卡"和"今日打卡成功"同时出现的矛盾
 */
function dedupeNotifications(items: NotificationInAppItem[]): NotificationInAppItem[] {
  const groups = new Map<string, NotificationInAppItem>()

  for (const item of items) {
    if (item.status === "dismissed") {
      continue
    }
    const date = item.createdAt.slice(0, 10) // "YYYY-MM-DD"
    const source = (item.payload?.source as string | undefined) ?? item.type
    const key = `${source}:${date}`

    const existing = groups.get(key)
    if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
      groups.set(key, item)
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
```

- [ ] **Step 2: 修改 fetchWorkspaceSidebarData 中的处理逻辑**

找到 `fetchWorkspaceSidebarData` 函数，在 `notifications.items` 赋值前包上去重调用：

```typescript
// 原来的：
notifications: notifications.items,

// 改为：
notifications: dedupeNotifications(notifications.items),
```

同样处理 fallback 分支中的 `notifications: notifications.items`。

- [ ] **Step 3: 验证构建**

Run: `cd /Users/baoyouhua/Documents/CodeTutor && pnpm build 2>&1 | tail -20`
Expected: 无 TypeScript 错误，构建成功

- [ ] **Step 4: Commit**

```bash
git add providers/workspace-sidebar-provider.tsx
git commit -m "feat(sidebar): 添加同源通知去重逻辑，解决矛盾提醒同时展示问题"
```

---

## Task 2: 新建通知详情弹框组件

**Files:**
- Create: `components/layout/notification-detail-dialog.tsx`
- Test: `scripts/check-notification-detail-dialog.mjs`（新建）

- [ ] **Step 1: 创建弹框组件文件**

Create: `components/layout/notification-detail-dialog.tsx`

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, ExternalLink, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import type { NotificationInAppItem } from "@/lib/api/contracts/notifications"
import { cn } from "@/lib/utils"

type NotificationDetailDialogProps = {
  notification: NotificationInAppItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarkRead: (id: string) => Promise<unknown>
  onDismiss: (id: string) => Promise<unknown>
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - dateDay.getTime()) / 86400000)

  if (diffDays === 0) return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
  if (diffDays === 1) return "昨天"
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onMarkRead,
  onDismiss,
}: NotificationDetailDialogProps) {
  const router = useRouter()
  const toast = useAppToast()
  const [dismissing, setDismissing] = useState(false)

  // 打开时：如果是未读状态，静默标记已读
  useEffect(() => {
    if (!open || !notification || notification.status !== "unread") return
    void onMarkRead(notification.id)
  }, [open, notification])

  const handlePrimaryAction = useCallback(() => {
    if (!notification?.actionHref) return
    onOpenChange(false)
    router.push(notification.actionHref)
  }, [notification, router, onOpenChange])

  const handleDismiss = useCallback(async () => {
    if (!notification || dismissing) return
    setDismissing(true)
    try {
      await onDismiss(notification.id)
      toast.success("提醒已忽略")
      onOpenChange(false)
    } catch {
      toast.error("忽略失败，请重试")
    } finally {
      setDismissing(false)
    }
  }, [notification, dismissing, onDismiss, toast, onOpenChange])

  if (!notification) return null

  const isLoading = dismissing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">{notification.title}</DialogTitle>
          <DialogDescription className="sr-only">{notification.content}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 内容 */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {notification.content}
          </p>

          {/* 时间 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span>时间：{formatRelativeTime(notification.createdAt)}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-2 pt-2">
          {notification.actionHref && notification.actionLabel ? (
            <Button
              variant="default"
              onClick={handlePrimaryAction}
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {notification.actionLabel}
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            忽略
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 创建占位符测试脚本**

Create: `scripts/check-notification-detail-dialog.mjs`

```javascript
// 占位测试脚本，用于验证组件文件存在和基本导出
import { readFileSync } from "fs"
import { resolve } from "path"

const filePath = resolve("components/layout/notification-detail-dialog.tsx")
try {
  const content = readFileSync(filePath, "utf-8")
  if (!content.includes("NotificationDetailDialog")) {
    throw new Error("组件未导出 NotificationDetailDialog")
  }
  if (!content.includes('"use client"')) {
    throw new Error("缺少 use client 指令")
  }
  console.log("✅ 通知详情弹框组件文件检查通过")
} catch (err) {
  console.error("❌", err.message)
  process.exit(1)
}
```

Run: `node scripts/check-notification-detail-dialog.mjs`
Expected: `✅ 通知详情弹框组件文件检查通过`

- [ ] **Step 3: 验证构建**

Run: `pnpm build 2>&1 | grep -E "(error|warning|✓)" | tail -10`
Expected: 无该组件相关错误

- [ ] **Step 4: Commit**

```bash
git add components/layout/notification-detail-dialog.tsx scripts/check-notification-detail-dialog.mjs
git commit -m "feat(sidebar): 新增通知详情弹框组件，支持查看提醒详情与操作"
```

---

## Task 3: 重构 DashboardSidebar 提醒区

**Files:**
- Modify: `components/layout/dashboard-sidebar.tsx`（调整布局顺序 + 折叠卡片 + 列表行 + 弹框集成）

- [ ] **Step 1: 添加新 import 和 state**

在文件顶部的 import 区，找到 `X` from lucide-react，确认已存在（已在原文件第14行）。

在 `DashboardSidebarProps` 类型之后、`SUBSCRIPTION_PLACEHOLDER` 之前，添加折叠状态和弹框状态：

```typescript
const SUBSCRIPTION_PLACEHOLDER: SubscriptionSnapshot = {
  // ... 保持不变
}

// --- 新增：折叠状态与弹框状态 ---
type NotificationPanelState = {
  expanded: boolean
  selectedNotification: NotificationInAppItem | null
  dialogOpen: boolean
}
```

在组件函数内，找到 `const [profileFeedbackMessage, setProfileFeedbackMessage] = useState<string | null>(null)` 这一行，在其后添加：

```typescript
  const [profileFeedbackMessage, setProfileFeedbackMessage] = useState<string | null>(null)
  const [notifPanel, setNotifPanel] = useState<NotificationPanelState>({
    expanded: false,
    selectedNotification: null,
    dialogOpen: false,
  })
```

- [ ] **Step 2: 移除旧提醒区域（整个 `notifications.length > 0` 分支）**

找到以下代码块（大约在第279-352行），**删除整个块**：

```tsx
{notifications.length > 0 ? (
  <div className="space-y-2">
    {notifications.map((item) => {
      // ... 整个旧卡片渲染逻辑
    })}
  </div>
) : (
  <div className="rounded-xl ...">
    当前没有新的学习提醒...
  </div>
)}
```

替换为新的折叠卡片：

```tsx
{/* 学习提醒折叠卡片 */}
<div className="rounded-[24px] border border-border/60 bg-surface-2/80 overflow-hidden">
  {/* 折叠头部：可点击切换展开状态 */}
  <button
    type="button"
    onClick={() => setNotifPanel((p) => ({ ...p, expanded: !p.expanded }))}
    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-background/40"
  >
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
        <Bell className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">学习提醒</p>
        <p className="text-[11px] text-muted-foreground">站内提醒与关键进度节点</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
        {unreadNotificationCount > 0 ? `${unreadNotificationCount} 条未读` : "已读完"}
      </span>
      <span className="text-muted-foreground transition-transform duration-200" style={{ transform: notifPanel.expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
        ▼
      </span>
    </div>
  </button>

  {/* 折叠内容 */}
  <div
    className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      notifPanel.expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
    )}
  >
    <div className="border-t border-border/40">
      {notifications.length > 0 ? (
        <div className="divide-y divide-border/30">
          {notifications.map((item) => {
            const isUnread = item.status === "unread"
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setNotifPanel((p) => ({
                    ...p,
                    selectedNotification: item,
                    dialogOpen: true,
                  }))
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-background/50 active:bg-background/70"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isUnread ? "bg-brand" : "bg-muted-foreground/30",
                    )}
                  />
                  <span className={cn(
                    "truncate text-sm",
                    isUnread ? "font-medium text-foreground" : "text-muted-foreground",
                  )}>
                    {item.title}
                  </span>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                  isUnread
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-border/50 bg-background/40 text-muted-foreground",
                )}>
                  {isUnread ? "未读" : "已读"}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          暂无新提醒。完成打卡或任务后，新的提醒会出现在这里。
        </div>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 3: 在 `<nav>` 前插入新的折叠提醒块，并移除旧的提醒区**

确认找到 `<nav className="space-y-1 rounded-[24px] ...>`（导航菜单），确保新的提醒折叠块**在它之前**，并且**在 `<ProfileEditDialog />` 之后**。

- [ ] **Step 4: 添加弹框组件和弹框状态处理**

找到 `<ProfileEditDialog ... />`（约第257-261行），在其后添加：

```tsx
      <NotificationDetailDialog
        open={notifPanel.dialogOpen}
        onOpenChange={(open) =>
          setNotifPanel((p) => ({ ...p, dialogOpen: open }))
        }
        notification={notifPanel.selectedNotification}
        onMarkRead={markNotificationRead}
        onDismiss={dismissNotification}
      />
```

在 import 区末尾添加：

```typescript
import { NotificationDetailDialog } from "@/components/layout/notification-detail-dialog"
```

- [ ] **Step 5: 验证 TypeScript 无错误**

Run: `pnpm build 2>&1 | grep -E "error|✓" | tail -20`
Expected: 无 TS 错误

- [ ] **Step 6: Commit**

```bash
git add components/layout/dashboard-sidebar.tsx
git commit -m "feat(sidebar): 重构提醒区为折叠卡片+列表行，点击打开详情弹框"
```

---

## Task 4: 整体验证

- [ ] **Step 1: 运行完整构建**

Run: `pnpm build 2>&1 | tail -5`
Expected: `✓` 构建成功

- [ ] **Step 2: 运行 lint 检查**

Run: `pnpm lint 2>&1 | tail -5`
Expected: 无 error 级别问题

- [ ] **Step 3: 启动开发服务器手动验证**

Run: `pnpm dev` — 打开浏览器访问 `/learn` 或任意使用 `DashboardSidebar` 的页面，验证：
1. 导航菜单在第一屏可见（未被提醒挤压）
2. 提醒默认收起，显示未读数
3. 点击展开，列表行只显示标题 + 状态
4. 点击列表行，弹框正常打开并显示详情
5. 弹框操作按钮可正常跳转或忽略
6. 若有矛盾通知（如打卡状态），只展示最新一条
