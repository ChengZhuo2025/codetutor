# 管理后台 Phase 1 设计文档

> 文档类型：管理后台 Phase 1 实施设计
> 产品名称：AI编程学习教练
> 版本：v1.0
> 状态：已完成（2026-04-01）
> 创建日期：2026-03-31
> 适用阶段：Phase 1 - 管理员认证 + 后台壳层 + 反馈工单
> 关联文档：`docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`

---

## 1. 目标与范围

### 1.1 目标

建立管理后台的基础能力，让客服和运��能够：
- 通过 Supabase Auth 登录后台
- 查看系统核心指标的简化版总览
- 处理用户反馈工单（查看、回复、状态切换）

### 1.2 包含页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/admin/login` | 管理员登录页 | 邮箱 + 密码登录 |
| `/admin` | 总览看板 | 简化版，4-5 个核心指标 |
| `/admin/feedback` | 反馈工单列表 | 搜索、筛选、分页 |
| `/admin/feedback/[id]` | 反馈工单详情 | 详情、回复、状态切换 |

### 1.3 不包含（留到后续阶段）

- 用户运营模块
- 学习运营模块
- AI 运营模块
- 细粒度 UI 权限控制
- 总览看板的完整数据分析

---

## 2. 数据库设计

### 2.1 新增表结构

#### `admin_accounts`

管理员账号表，记录后台管理员与 Supabase Auth 用户的关联。

```sql
CREATE TABLE admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_accounts_user_id ON admin_accounts(user_id);
CREATE INDEX idx_admin_accounts_status ON admin_accounts(status);
```

#### `admin_roles`

角色定义表。

```sql
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初始角色
INSERT INTO admin_roles (code, name, description) VALUES
  ('super_admin', '超级管理员', '拥有所有权限'),
  ('support_admin', '客服管理员', '负责处理用户反馈和工单'),
  ('ops_admin', '运营管理员', '负责用户运营和数据导出'),
  ('ai_ops_admin', 'AI运营管理员', '负责AI配置和调用监控');
```

#### `admin_account_roles`

管理员与角色的多对多关联表。

```sql
CREATE TABLE admin_account_roles (
  admin_account_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  admin_role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_account_id, admin_role_id)
);
```

#### `admin_audit_logs`

管理员操作审计日志表。

```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_accounts(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  request_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
```

### 2.2 扩展现有表

#### `feedback_tickets` 扩展

为后续工单分派和 SLA 功能预留字段（Phase 1 仅做字段扩展，不做页面实现）：

```sql
ALTER TABLE feedback_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id UUID REFERENCES admin_accounts(id),
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
```

### 2.3 迁移文件

迁移文件名：`supabase/migrations/017_create_admin_accounts.sql`

---

## 3. 后端 API 设计

### 3.1 新增接口

#### 管理员认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/auth/login` | POST | 管理员登录 |
| `/api/admin/auth/session` | GET | 获取当前管理员会话 |
| `/api/admin/auth/logout` | POST | 管理员登出 |

#### 总览看板

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/dashboard/overview` | GET | 获取总览看板数据 |

### 3.2 已有接口（复用）

反馈工单接口已存在，继续使用：

| 接口 | 状态 |
|------|------|
| `GET /api/admin/feedback` | 已有 |
| `GET /api/admin/feedback/{id}` | 已有 |
| `POST /api/admin/feedback/{id}/reply` | 已有 |
| `POST /api/admin/feedback/{id}/status` | 已有 |

### 3.3 响应结构

统一使用项目标准响应格式：

```json
{
  "code": "OK",
  "message": "success",
  "data": { ... }
}
```

新增错误码：

| 错误码 | HTTP | 场景 |
|--------|------|------|
| `ADMIN_FORBIDDEN` | 403 | 管理员未登录或角色无权限 |
| `ADMIN_INVALID_CREDENTIALS` | 401 | 登录凭证无效 |
| `ADMIN_INACTIVE_ACCOUNT` | 403 | 管理员账号已停用 |

### 3.4 后端模块

新增服务模块：

```
server/modules/
├── admin-auth/
│   ├── service.ts        # 认证服务
│   └── route-handler.ts  # 路由编排
└── admin-dashboard/
    ├── service.ts        # 看板数据聚合
    └── route-handler.ts  # 路由编排
```

复用现有：
- `server/lib/request-admin.ts` — 管理员身份解析
- `server/modules/feedback/` — 反馈业务服务

### 3.5 OpenAPI 文档

新增接口需同步更新：
- `server/modules/api-docs/schemas.ts` — 新增 schema 定义
- `server/modules/api-docs/openapi.ts` — 注册路由

---

## 4. 前端设计

### 4.1 目录结构

按项目规范新增两个业务域：

```
features/
├── admin-shell/           # 后台壳层
│   ├── components/
│   │   ├── admin-sidebar.tsx       # 侧边栏
│   │   ├── admin-header.tsx        # 顶部栏
│   │   └── admin-layout.tsx        # 布局容器
│   ├── types.ts                    # 类型定义
│   └── data/
│       └── menu-config.ts          # 菜单配置
│
└── admin-feedback/        # 反馈工单域
    ├── pages/
    │   ├── feedback-list-page.tsx   # 列表页（薄装配）
    │   └── feedback-detail-page.tsx # 详情页（薄装配）
    ├── components/
    │   ├── feedback-list.tsx        # 列表组件
    │   ├── feedback-detail.tsx      # 详情组件
    │   └── reply-form.tsx           # 回复表单
    ├── types.ts                     # 类型定义
    └── data/
        └── status-config.ts         # 状态配置
```

路由入口（薄装配，只做组件引用）：

```
app/
├── admin/
│   ├── login/
│   │   └── page.tsx                 # 登录页
│   ├── layout.tsx                   # 后台布局（引用 admin-shell）
│   ├── page.tsx                     # 总览看板（简化版）
│   └── feedback/
│       ├── page.tsx                 # 反馈列表（引用 admin-feedback）
│       └── [id]/
│           └── page.tsx             # 反馈详情（引用 admin-feedback）
```

### 4.2 布局结构

```
┌─────────────────────────────────────────────┐
│  AdminLayout (app/admin/layout.tsx)         │
│  ┌──────────┬──────────────────────────────┐│
│  │          │ AdminHeader                 ││
│  │ Sidebar  ├──────────────────────────────┤│
│  │          │                              ││
│  │          │  children (page content)    ││
│  │          │                              ││
│  └──────────┴──────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 4.3 侧边栏菜单

Phase 1 只显示可访问的菜单项（未实现的显示为禁用）：

```typescript
const menuItems = [
  { label: "总览看板", href: "/admin", icon: LayoutDashboard, active: true },
  { label: "用户运营", href: "/admin/users", icon: Users, active: false },
  { label: "反馈工单", href: "/admin/feedback", icon: MessageSquare, active: true },
  { label: "学习运营", href: "/admin/learning", icon: BookOpen, active: false },
  {
    label: "AI 运营",
    href: "/admin/ai",
    icon: Bot,
    active: false,
    children: [
      { label: "AI 概览", href: "/admin/ai", active: false },
      { label: "Provider 管理", href: "/admin/ai/providers", active: false },
      // ...
    ]
  },
  { label: "系统设置", href: "/admin/settings", icon: Settings, active: false },
]
```

### 4.4 组件复用

使用项目现有的 `components/ui/` 组件：

| 原型组件 | 项目复用组件 |
|----------|--------------|
| 按钮 | `components/ui/button.tsx` |
| 表格 | `components/ui/table.tsx` |
| 卡片 | `components/ui/card.tsx` |
| 表单 | `components/ui/form.tsx` |
| 下拉选择 | `components/ui/select.tsx` |
| 对话框 | `components/ui/dialog.tsx` |
| Toast | `components/ui/sonner.tsx` |

---

## 5. 总览看板（简化版）

### 5.1 指标定义

| 指标 | 说明 | 数据来源 |
|------|------|----------|
| 待处理反馈 | status = 'pending' 的工单数 | `feedback_tickets` |
| 今日新增用户 | 今天创建的用户数 | `auth.users` |
| 今日完成任务 | 今天完成的任务数 | `user_tasks` |
| 活跃学习计划 | status = 'active' 的计划数 | `user_learning_paths` |
| 今日打卡人数 | 今天打卡的用户数 | `daily_checkins` |

### 5.2 页面布局

```
┌────────────────────────────────────────┐
│  总览看板                               │
├────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ 指标1 │ │ 指标2 │ │ 指标3 │          │
│  └──────┘ └──────┘ └──────┘          │
│  ┌──────┐ ┌──────┐                   │
│  │ 指标4 │ │ 指标5 │                   │
│  └──────┘ └──────┘                   │
└────────────────────────────────────────┘
```

每个指标卡片显示：数值、标签、较昨日变化（暂用 placeholder）。

---

## 6. 认证流程

### 6.1 登录流程

```
用户访问 /admin/login
    ↓
输入邮箱 + 密码
    ↓
POST /api/admin/auth/login
    ↓
Supabase Auth 验证
    ↓
查询 admin_accounts 确认身份
    ↓
返回会话信息（含角色列表）
    ↓
前端存储会话，跳转 /admin
```

### 6.2 会话验证

- 使用 Supabase 的 session cookie
- 后端通过 `server/lib/request-admin.ts` 解析管理员身份
- 未登录或会话过期返回 `ADMIN_FORBIDDEN`

### 6.3 Phase 1 简化

- 暂不做细粒度 UI 权限控制
- 所有登录的管理员都能访问 Phase 1 的所有页面
- 角色信息用于审计日志记录

---

## 7. 反馈工单页面

### 7.1 列表页

**功能**：
- 搜索：工单 ID、用户昵称、标题关键词
- 筛选：状态（全部/待处理/处理中/已解决/已关闭）、类型
- 排序：创建时间、更新时间
- 分页：每页 20 条

**表格列**：
- 选择框
- 工单号
- 标题（可点击进入详情）
- 用户（头像 + 昵称）
- 类型
- 优先级
- 状态（带颜色标签）
- 处理人
- 创建时间
- 操作（更多按钮）

### 7.2 详情页

**布局**：
```
┌────────────────────────────────────────┐
│  工单 #TK-1024                          │
│  ─────────────────────────────────────  │
│  状态：待处理 | 优先级：高 | 类型：功能问题│
│  创建时间：2026-03-31 09:32             │
├────────────────────────────────────────┤
│  [用户] 代码运行结果一直显示错误...      │
│           2026-03-31 09:32             │
│  [管理员] 请提供具体的任务 ID...         │
│           2026-03-31 10:15             │
├────────────────────────────────────────┤
│  [回复输入框]                           │
│  [提交回复] [切换状态]                   │
└────────────────────────────────────────┘
```

**功能**：
- 查看工单详细信息
- 查看历史对话（用户消息 + 管理员回复）
- 提交新回复
- 切换工单状态

---

## 8. TDD 开发规范

### 8.1 测试优先级

1. **数据库迁移测试** — 验证表结构、索引、约束
2. **后端 API 集成测试** — 验证接口契约、业务逻辑
3. **前端组件单元测试** — 验证组件行为（可选）

### 8.2 测试文件位置

```
scripts/
├── check-admin-accounts-schema.ts      # 数据库结构验证
├── check-admin-auth-api.ts             # 认证 API 测试
└── check-admin-dashboard-api.ts        # 看板 API 测试
```

### 8.3 测试覆盖目标

- API 路由：覆盖率 ≥ 80%
- 关键业务逻辑：覆盖率 ≥ 90%

---

## 9. 验收规范

### 9.1 后端 API 验收

- [ ] Swagger UI (`/api-docs`) 中能查看接口文档
- [ ] 接口返回统一的 `{ code, message, data }` 结构
- [ ] 管理员未登录时返回 `ADMIN_FORBIDDEN`
- [ ] 所有写操作记录审计日志

### 9.2 前端页面验收

- [ ] 页面在 1440px / 1024px / 768px 断点下布局正常
- [ ] 使用项目现有 `components/ui/` 组件和设计 token
- [ ] 空态、加载态、错误态有明确反馈
- [ ] 与原型交互行为一致（筛选、分页、状态切换）

### 9.3 集成验收

- [ ] 登录后能正常访问后台页面
- [ ] 退出后不能直接访问后台（重定向到登录页）
- [ ] 反馈工单的回复、状态切换能真实写入数据库

---

## 10. 文档同步更新

Phase 1 完成后，回写以下文档：

| 文档 | 更新内容 |
|------|----------|
| `CLAUDE.md` | 新增后台路由、后台域目录、Phase 1 完成状态 |
| `docs/plans/README.md` | 更新"当前未完成能力清单"，移除"管理员后台前端" |
| `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md` | 更新推进计划，标记 Phase 1 已完成 |

---

## 11. 实施顺序

1. **数据库** — 创建迁移文件 `017_create_admin_accounts.sql`
2. **后端 API** — 实现认证、看板服务
3. **后端测试** — 编写并验证 API 测试
4. **前端壳层** — 实现 `admin-shell` 域（布局、侧边栏、头部）
5. **前端反馈** — 实现 `admin-feedback` 域（列表、详情）
6. **前端看板** — 实现简化版总览
7. **集成验收** — 端到端测试
8. **文档更新** — 回写持久性文档

---

## 12. 风险与约束

| 风险 | 缓解措施 |
|------|----------|
| Supabase Auth 集成复杂度 | 先用现有 `server/lib/supabase.ts` 客户端，复用已有模式 |
| 审计日志写入失败 | 使用事务确保业务操作与审计日志的原子性 |
| 前后端类型不一致 | 使用 Zod schema 定义契约，前后端共享 |

---

*本设计文档基于 `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md` 的 Phase 1 规划细化而成。*
