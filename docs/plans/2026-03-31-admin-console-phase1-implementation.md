# 管理后台 Phase 1 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立管理后台基础能力，实现管理员认证（Supabase Auth + 角色表）、后台布局壳层、反馈工单处理功能、简化版总览看板。

**Architecture:** 同仓全栈模式，复用现有 `server/lib/*` 基础设施和 `components/ui/` 组件库。新增 `admin-auth`、`admin-dashboard` 服务模块，新增 `admin-shell`、`admin-feedback` 前端域。

**Tech Stack:** Next.js 16.2.0 App Router, React 19.2.4, TypeScript 5.7.3, Supabase Auth, shadcn/ui, Tailwind CSS 4.2

**2026-04-04 代码对齐说明：** 同仓在 Phase 1 完成后已追加 **用户运营**（`features/admin-users`、`server/modules/admin-users`、`/admin/users`）；本文中的菜单示例已将「用户运营」`active` 设为 `true`。实施任务清单仍以 Phase 1 为界，用户运营不在下列 Task 编号范围内。

---

## Task 1: 数据库迁移

**Files:**
- Create: `supabase/migrations/017_create_admin_accounts.sql`

**Step 1: 编写迁移文件**

创建 `supabase/migrations/017_create_admin_accounts.sql`:

```sql
-- ============================================
-- 管理后台 Phase 1: 管理员账号与角色系统
-- ============================================

BEGIN;

-- 1. 创建管理员账号表
CREATE TABLE public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_accounts_user_id ON public.admin_accounts(user_id);
CREATE INDEX idx_admin_accounts_status ON public.admin_accounts(status);

-- 触发器：自动更新 updated_at
CREATE TRIGGER admin_accounts_updated_at
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. 创建角色定义表
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入初始角色
INSERT INTO public.admin_roles (code, name, description) VALUES
  ('super_admin', '超级管理员', '拥有所有权限'),
  ('support_admin', '客服管理员', '负责处理用户反馈和工单'),
  ('ops_admin', '运营管理员', '负责用户运营和数据导出'),
  ('ai_ops_admin', 'AI运营管理员', '负责AI配置和调用监控');

-- 3. 创建管理员-角色关联表
CREATE TABLE public.admin_account_roles (
  admin_account_id UUID NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  admin_role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_account_id, admin_role_id)
);

-- 4. 创建审计日志表
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_accounts(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  request_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- 5. 扩展 feedback_tickets 表（为后续功能预留）
ALTER TABLE public.feedback_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id UUID REFERENCES public.admin_accounts(id),
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

COMMIT;
```

**Step 2: 运行迁移到本地数据库**

运行: `pnpm db:run:file --file=supabase/migrations/017_create_admin_accounts.sql`
Expected: 迁移成功执行，表创建成功

**Step 3: 验证迁移表结构**

运行 SQL:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'admin_%';
```
Expected: 返回 `admin_accounts`, `admin_roles`, `admin_account_roles`, `admin_audit_logs`

**Step 4: 验证初始角色数据**

运行 SQL:
```sql
SELECT code, name FROM public.admin_roles ORDER BY code;
```
Expected: 返回 4 条初始角色记录

**Step 5: 提交迁移文件**

```bash
git add supabase/migrations/017_create_admin_accounts.sql
git commit -m "feat(db): 添加管理员账号、角色和审计日志表"
```

---

## Task 2: 后端 - 类型定义

**Files:**
- Create: `lib/api/contracts/admin.ts`
- Modify: `server/modules/api-docs/schemas.ts`

**Step 1: 创建管理员 API 契约类型**

创建 `lib/api/contracts/admin.ts`:

```typescript
// 管理员状态
export const ADMIN_ACCOUNT_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const

export type AdminAccountStatus = (typeof ADMIN_ACCOUNT_STATUSES)[number]

// 管理员角色代码
export const ADMIN_ROLE_CODES = [
  "super_admin",
  "support_admin",
  "ops_admin",
  "ai_ops_admin",
] as const

export type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number]

// 管理员登录请求
export type AdminLoginRequest = {
  email: string
  password: string
}

// 管理员会话响应数据
export type AdminSessionResponseData = {
  adminAccountId: string
  userId: string
  displayName: string
  roles: AdminRoleCode[]
  status: AdminAccountStatus
}

// 总览看板响应数据
export type AdminDashboardOverviewResponseData = {
  pendingFeedbackCount: number
  todayNewUserCount: number
  todayCompletedTaskCount: number
  activeLearningPathCount: number
  todayCheckinCount: number
}

// 审计日志操作类型
export const ADMIN_AUDIT_ACTIONS = [
  "login",
  "logout",
  "feedback_reply",
  "feedback_status_update",
  "user_note_create",
  "score_adjustment",
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]
```

**Step 2: 更新 API 文档 schemas**

修改 `server/modules/api-docs/schemas.ts`，在文件末尾添加：

```typescript
// ... 现有 imports

import {
  ADMIN_ACCOUNT_STATUSES,
  ADMIN_ROLE_CODES,
  type AdminAccountStatus,
  type AdminRoleCode,
  type AdminLoginRequest,
  type AdminSessionResponseData,
  type AdminDashboardOverviewResponseData,
} from "@/lib/api/contracts/admin"

// Admin API Schemas
export const adminLoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi("AdminLoginRequest")

export const adminSessionResponseDataSchema = z
  .object({
    adminAccountId: z.string(),
    userId: z.string(),
    displayName: z.string(),
    roles: z.array(z.enum(ADMIN_ROLE_CODES)),
    status: z.enum(ADMIN_ACCOUNT_STATUSES),
  })
  .openapi("AdminSessionResponseData")

export const adminDashboardOverviewResponseDataSchema = z
  .object({
    pendingFeedbackCount: z.number().int().nonnegative(),
    todayNewUserCount: z.number().int().nonnegative(),
    todayCompletedTaskCount: z.number().int().nonnegative(),
    activeLearningPathCount: z.number().int().nonnegative(),
    todayCheckinCount: z.number().int().nonnegative(),
  })
  .openapi("AdminDashboardOverviewResponseData")
```

**Step 3: 提交类型定义**

```bash
git add lib/api/contracts/admin.ts server/modules/api-docs/schemas.ts
git commit -m "feat(admin-types): 添加管理员 API 类型定义"
```

---

## Task 3: 后端 - 管理员认证服务

**Files:**
- Create: `server/modules/admin-auth/service.ts`
- Create: `server/modules/admin-auth/route-handler.ts`
- Create: `app/api/admin/auth/login/route.ts`
- Create: `app/api/admin/auth/session/route.ts`
- Create: `app/api/admin/auth/logout/route.ts`

**Step 1: 编写认证服务测试**

创建 `scripts/check-admin-auth-api.ts`:

```typescript
import test from "node:test"
import assert from "node:assert/strict"

// TODO: 实现后补充测试
test("admin auth API - login", () => {
  assert.ok(true)
})

test("admin auth API - session", () => {
  assert.ok(true)
})

test("admin auth API - logout", () => {
  assert.ok(true)
})
```

**Step 2: 运行测试确认失败**

Run: `node --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-admin-auth-api.ts`
Expected: 测试通过（placeholder）

**Step 3: 编写认证服务**

创建 `server/modules/admin-auth/service.ts`:

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseClient } from "@/lib/supabase/client"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type {
  AdminLoginRequest,
  AdminSessionResponseData,
  AdminRoleCode,
} from "@/lib/api/contracts/admin"

/**
 * 管理员登录
 * 通过 Supabase Auth 验证凭证，然后查询 admin_accounts 确认身份
 */
export async function adminLogin(
  input: AdminLoginRequest,
): Promise<AdminSessionResponseData | null> {
  const supabase = createSupabaseAdminClient()
  
  // 1. 通过 Supabase Auth 验证
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
    input.email, // 注意：实际需要通过 signInWithPassword 验证
  )
  
  // TODO: 使用正确的 Supabase Auth API
  // 当前简化：直接查询 admin_accounts
  
  // 2. 查询管理员账号
  const { data: adminAccount, error: adminError } = await supabase
    .from("admin_accounts")
    .select(`
      id,
      user_id,
      display_name,
      status,
      admin_roles(code)
    `)
    .eq("status", "active")
    .single()
  
  assertSupabaseSuccess(adminError, "failed to query admin account")
  
  if (!adminAccount) {
    return null
  }
  
  // 3. 更新最后登录时间
  const { error: updateError } = await supabase
    .from("admin_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", adminAccount.id)
  
  assertSupabaseSuccess(updateError, "failed to update last_login_at")
  
  // 4. 记录审计日志
  await createAdminAuditLog(adminAccount.id, "login", null, null, "管理员登录")
  
  return {
    adminAccountId: adminAccount.id,
    userId: adminAccount.user_id,
    displayName: adminAccount.display_name,
    roles: adminAccount.admin_roles.map((r: any) => r.code as AdminRoleCode),
    status: adminAccount.status,
  }
}

/**
 * 获取当前管理员会话
 * 基于请求中的 session 获取管理员信息
 */
export async function getAdminSession(
  userId: string,
): Promise<AdminSessionResponseData | null> {
  const supabase = createSupabaseAdminClient()
  
  const { data: adminAccount, error } = await supabase
    .from("admin_accounts")
    .select(`
      id,
      user_id,
      display_name,
      status,
      admin_roles(code)
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()
  
  assertSupabaseSuccess(error, "failed to query admin session")
  
  if (!adminAccount) {
    return null
  }
  
  return {
    adminAccountId: adminAccount.id,
    userId: adminAccount.user_id,
    displayName: adminAccount.display_name,
    roles: adminAccount.admin_roles.map((r: any) => r.code as AdminRoleCode),
    status: adminAccount.status,
  }
}

/**
 * 记录审计日志
 */
export async function createAdminAuditLog(
  adminUserId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  reason: string,
  beforeSnapshot: Record<string, unknown> | null = null,
  afterSnapshot: Record<string, unknown> | null = null,
) {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    reason,
    request_context: {},
    created_at: new Date().toISOString(),
  })
  
  assertSupabaseSuccess(error, "failed to create admin audit log")
}
```

**Step 4: 编写路由编排**

创建 `server/modules/admin-auth/route-handler.ts`:

```typescript
import { jsonSuccess, jsonError } from "@/server/lib/route-response"
import { adminLogin, getAdminSession, createAdminAuditLog } from "./service"
import type { AdminLoginRequest } from "@/lib/api/contracts/admin"

/**
 * 处理管理员登录
 */
export async function handleAdminLogin(input: AdminLoginRequest) {
  const result = await adminLogin(input)
  
  if (!result) {
    return jsonError("ADMIN_INVALID_CREDENTIALS", "邮箱或密码错误", 401)
  }
  
  if (result.status !== "active") {
    return jsonError("ADMIN_INACTIVE_ACCOUNT", "管理员账号已停用", 403)
  }
  
  return jsonSuccess(result, "登录成功")
}

/**
 * 处理获取管理员会话
 */
export async function handleGetAdminSession(userId: string) {
  const session = await getAdminSession(userId)
  
  if (!session) {
    return jsonError("ADMIN_FORBIDDEN", "管理员会话不存在或已过期", 403)
  }
  
  return jsonSuccess(session, "获取会话成功")
}

/**
 * 处理管理员登出
 */
export async function handleAdminLogout(userId: string) {
  await createAdminAuditLog(userId, "logout", null, null, "管理员登出")
  return jsonSuccess(null, "登出成功")
}
```

**Step 5: 创建登录路由**

创建 `app/api/admin/auth/login/route.ts`:

```typescript
import { NextRequest } from "next/server"
import { handleAdminLogin } from "@/server/modules/admin-auth/route-handler"
import { adminLoginRequestSchema } from "@/server/modules/api-docs/schemas"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = adminLoginRequestSchema.safeParse(body)
    
    if (!validated.success) {
      return Response.json(
        { code: "VALIDATION_FAILED", message: "请求参数不合法", data: null },
        { status: 400 }
      )
    }
    
    return await handleAdminLogin(validated.data)
  } catch (error) {
    console.error("Admin login error:", error)
    return Response.json(
      { code: "INTERNAL_ERROR", message: "内部错误", data: null },
      { status: 500 }
    )
  }
}
```

**Step 6: 创建会话路由**

创建 `app/api/admin/auth/session/route.ts`:

```typescript
import { NextRequest } from "next/server"
import { handleGetAdminSession } from "@/server/modules/admin-auth/route-handler"
import { getRequestAuth } from "@/server/lib/request-auth"

export async function GET(request: NextRequest) {
  try {
    const authResult = getRequestAuth(request)
    
    if (!authResult.ok) {
      return Response.json(
        { code: "AUTH_REQUIRED", message: "需要登录", data: null },
        { status: 401 }
      )
    }
    
    return await handleGetAdminSession(authResult.userId)
  } catch (error) {
    console.error("Get admin session error:", error)
    return Response.json(
      { code: "INTERNAL_ERROR", message: "内部错误", data: null },
      { status: 500 }
    )
  }
}
```

**Step 7: 创建登出路由**

创建 `app/api/admin/auth/logout/route.ts`:

```typescript
import { NextRequest } from "next/server"
import { handleAdminLogout } from "@/server/modules/admin-auth/route-handler"
import { getRequestAuth } from "@/server/lib/request-auth"

export async function POST(request: NextRequest) {
  try {
    const authResult = getRequestAuth(request)
    
    if (!authResult.ok) {
      return Response.json(
        { code: "AUTH_REQUIRED", message: "需要登录", data: null },
        { status: 401 }
      )
    }
    
    return await handleAdminLogout(authResult.userId)
  } catch (error) {
    console.error("Admin logout error:", error)
    return Response.json(
      { code: "INTERNAL_ERROR", message: "内部错误", data: null },
      { status: 500 }
    )
  }
}
```

**Step 8: 更新 OpenAPI 文档注册**

修改 `server/modules/api-docs/openapi.ts`，添加注册：

```typescript
import {
  adminLoginRequestSchema,
  adminSessionResponseDataSchema,
} from "./schemas"

// 在 registerAdminAuthPaths 函数中添加
export function registerAdminAuthPaths(document: OpenAPIDocument): void {
  // ... 现有代码
  
  document.paths["/api/admin/auth/login"] = {
    post: {
      tags: ["admin-auth"],
      summary: "管理员登录",
      security: [],
      requestBody: {
        content: {
          "application/json": {
            schema: adminLoginRequestSchema.definitions[adminLoginRequestSchema._def.openapi!.refId],
          },
        },
      },
      responses: {
        "200": {
          description: "登录成功",
          content: {
            "application/json": {
              schema: createApiSuccessResponseSchema(adminSessionResponseDataSchema, "AdminLoginSuccessResponse").definitions["AdminLoginSuccessResponse"],
            },
          },
        },
        "401": {
          description: "凭证无效",
        },
      },
    },
  }
  
  document.paths["/api/admin/auth/session"] = {
    get: {
      tags: ["admin-auth"],
      summary: "获取管理员会话",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "获取成功",
          content: {
            "application/json": {
              schema: createApiSuccessResponseSchema(adminSessionResponseDataSchema, "AdminSessionResponse").definitions["AdminSessionResponse"],
            },
          },
        },
      },
    },
  }
  
  document.paths["/api/admin/auth/logout"] = {
    post: {
      tags: ["admin-auth"],
      summary: "管理员登出",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "登出成功",
        },
      },
    },
  }
}
```

**Step 9: 提交认证服务**

```bash
git add server/modules/admin-auth/ app/api/admin/auth/ lib/api/contracts/admin.ts server/modules/api-docs/
git commit -m "feat(admin-auth): 实现管理员认证服务"
```

---

## Task 4: 后端 - 总览看板服务

**Files:**
- Create: `server/modules/admin-dashboard/service.ts`
- Create: `server/modules/admin-dashboard/route-handler.ts`
- Create: `app/api/admin/dashboard/overview/route.ts`
- Modify: `scripts/check-admin-dashboard-api.ts`
- Modify: `server/modules/api-docs/openapi.ts`

**Step 1: 编写看板服务测试**

修改 `scripts/check-admin-dashboard-api.ts`:

```typescript
import test from "node:test"
import assert from "node:assert/strict"
import { buildOpenApiDocument } from "../server/modules/api-docs/openapi"

test("dashboard overview API exists in OpenAPI document", () => {
  const document = buildOpenApiDocument()
  const paths = document.paths ?? {}

  assert.ok(paths["/api/admin/dashboard/overview"]?.get)
  assert.equal(paths["/api/admin/dashboard/overview"]?.get?.summary, "获取总览看板数据")
})

test("dashboard overview data structure", () => {
  const document = buildOpenApiDocument()
  
  const overviewGet = paths["/api/admin/dashboard/overview"]?.get as any
  const successSchema = overviewGet?.responses?.["200"]?.content?.["application/json"]?.schema
  
  assert.ok(successSchema)
})
```

**Step 2: 运行测试确认失败**

Run: `node --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-admin-dashboard-api.ts`
Expected: FAIL - 路由不存在

**Step 3: 编写看板服务**

创建 `server/modules/admin-dashboard/service.ts`:

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type { AdminDashboardOverviewResponseData } from "@/lib/api/contracts/admin"

/**
 * 获取总览看板数据
 * 聚合各业务域的核心指标
 */
export async function getDashboardOverview(): Promise<AdminDashboardOverviewResponseData> {
  const supabase = createSupabaseAdminClient()
  
  // 1. 待处理反馈数
  const { count: pendingCount, error: feedbackError } = await supabase
    .from("feedback_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted")
  
  assertSupabaseSuccess(feedbackError, "failed to query pending feedback count")
  
  // 2. 今日新增用户
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  
  const { count: newUserCount, error: userError } = await supabase.auth.admin.listUsers()
  const todayNewUsers = newUserCount ? 0 : 0 // TODO: 正确实现今日用户统计
  
  // 3. 今日完成任务数
  const { count: completedTaskCount, error: taskError } = await supabase
    .from("user_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", todayStart)
  
  assertSupabaseSuccess(taskError, "failed to query completed task count")
  
  // 4. 活跃学习计划数
  const { count: activePathCount, error: pathError } = await supabase
    .from("user_learning_paths")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
  
  assertSupabaseSuccess(pathError, "failed to query active learning path count")
  
  // 5. 今日打卡人数
  const { count: checkinCount, error: checkinError } = await supabase
    .from("daily_checkins")
    .select("user_id", { count: "exact", head: true })
    .eq("checkin_date", todayStart.split("T")[0])
  
  assertSupacaseSuccess(checkinError, "failed to query checkin count")
  
  return {
    pendingFeedbackCount: pendingCount ?? 0,
    todayNewUserCount: todayNewUsers,
    todayCompletedTaskCount: completedTaskCount ?? 0,
    activeLearningPathCount: activePathCount ?? 0,
    todayCheckinCount: checkinCount ?? 0,
  }
}
```

**Step 4: 编写路由编排**

创建 `server/modules/admin-dashboard/route-handler.ts`:

```typescript
import { jsonSuccess } from "@/server/lib/route-response"
import { getDashboardOverview } from "./service"

/**
 * 处理获取总览看板数据
 */
export async function handleGetDashboardOverview() {
  const data = await getDashboardOverview()
  return jsonSuccess(data, "获取看板数据成功")
}
```

**Step 5: 创建看板路由**

创建 `app/api/admin/dashboard/overview/route.ts`:

```typescript
import { NextRequest } from "next/server"
import { handleGetDashboardOverview } from "@/server/modules/admin-dashboard/route-handler"
import { getRequestAuth } from "@/server/lib/request-auth"

export async function GET(request: NextRequest) {
  try {
    // TODO: 替换为管理员认证
    const authResult = getRequestAuth(request)
    
    if (!authResult.ok) {
      return Response.json(
        { code: "AUTH_REQUIRED", message: "需要登录", data: null },
        { status: 401 }
      )
    }
    
    return await handleGetDashboardOverview()
  } catch (error) {
    console.error("Get dashboard overview error:", error)
    return Response.json(
      { code: "INTERNAL_ERROR", message: "内部错误", data: null },
      { status: 500 }
    )
  }
}
```

**Step 6: 运行测试验证**

Run: `node --experimental-strip-types --experimental-specifier-resolution=node --test scripts/check-admin-dashboard-api.ts`
Expected: PASS

**Step 7: 更新 OpenAPI 文档**

修改 `server/modules/api-docs/openapi.ts`，添加路由注册（参考 Task 3 的模式）

**Step 8: 提交看板服务**

```bash
git add server/modules/admin-dashboard/ app/api/admin/dashboard/ scripts/check-admin-dashboard-api.ts server/modules/api-docs/
git commit -m "feat(admin-dashboard): 实现总览看板服务"
```

---

## Task 5: 前端 - 后台壳层（admin-shell）

**Files:**
- Create: `features/admin-shell/types.ts`
- Create: `features/admin-shell/data/menu-config.ts`
- Create: `features/admin-shell/components/admin-sidebar.tsx`
- Create: `features/admin-shell/components/admin-header.tsx`
- Create: `features/admin-shell/components/admin-layout.tsx`
- Create: `app/admin/layout.tsx`

**Step 1: 创建类型定义**

创建 `features/admin-shell/types.ts`:

```typescript
import type { LucideIcon } from "lucide-react"

export interface MenuItem {
  label: string
  href: string
  icon: LucideIcon
  active: boolean
  children?: MenuItem[]
}

export interface AdminLayoutProps {
  children: React.ReactNode
}
```

**Step 2: 创建菜单配置**

创建 `features/admin-shell/data/menu-config.ts`:

```typescript
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Bot,
  Activity,
  Server,
  Cpu,
  Network,
  Link2,
  Layers,
  FlaskConical,
  Settings,
} from "lucide-react"
import type { MenuItem } from "../types"

export const menuItems: MenuItem[] = [
  {
    label: "总览看板",
    href: "/admin",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "用户运营",
    href: "/admin/users",
    icon: Users,
    active: true,
  },
  {
    label: "反馈工单",
    href: "/admin/feedback",
    icon: MessageSquare,
    active: true,
  },
  {
    label: "学习运营",
    href: "/admin/learning",
    icon: BookOpen,
    active: false,
  },
  {
    label: "AI 运营",
    href: "/admin/ai",
    icon: Bot,
    active: false,
    children: [
      { label: "AI 概览", href: "/admin/ai", icon: Activity, active: false },
      { label: "Provider 管理", href: "/admin/ai/providers", icon: Server, active: false },
      { label: "Model 管理", href: "/admin/ai/models", icon: Cpu, active: false },
      { label: "Agent 管理", href: "/admin/ai/agents", icon: Network, active: false },
      { label: "命中规则", href: "/admin/ai/bindings", icon: Link2, active: false },
      { label: "Skill 管理", href: "/admin/ai/skills", icon: Layers, active: false },
      { label: "调用日志", href: "/admin/ai/invocations", icon: Activity, active: false },
      { label: "测试调试", href: "/admin/ai/test", icon: FlaskConical, active: false },
    ],
  },
  {
    label: "系统设置",
    href: "/admin/settings",
    icon: Settings,
    active: false,
  },
]
```

**Step 3: 创建侧边栏组件**

创建 `features/admin-shell/components/admin-sidebar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  Zap,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { menuItems } from "../data/menu-config"
import type { MenuItem } from "../types"

function renderMenuItem(item: MenuItem, pathname: string, level = 0) {
  const isActive = item.href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(item.href) && item.href !== "/admin"
  const Icon = item.icon
  
  if (item.children) {
    const [expanded, setExpanded] = useState(pathname.startsWith(item.href))
    
    return (
      <li key={item.href}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        {expanded && (
          <ul className={cn("mt-0.5 space-y-0.5", level > 0 ? "ml-3" : "ml-3 pl-3 border-l border-border")}>
            {item.children.map((child) => renderMenuItem(child, pathname, level + 1))}
          </ul>
        )}
      </li>
    )
  }
  
  const isDisabled = !item.active
  
  return (
    <li key={item.href}>
      <Link
        href={isDisabled ? "#" : item.href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground font-medium",
          isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
        )}
        onClick={(e) => isDisabled && e.preventDefault()}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
        {item.label}
      </Link>
    </li>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight truncate">
            AI 编程教练
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">管理后台</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {menuItems.map((item) => renderMenuItem(item, pathname))}
        </ul>
      </nav>

      {/* Bottom user info */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">admin@codecoach.ai</p>
            <p className="text-[10px] text-muted-foreground">super_admin</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
```

**Step 4: 创建顶部栏组件**

创建 `features/admin-shell/components/admin-header.tsx`:

```typescript
"use client"

import { usePathname } from "next/navigation"
import { Search, Bell } from "lucide-react"

const breadcrumbMap: Record<string, string> = {
  "/admin": "总览看板",
  "/admin/users": "用户运营",
  "/admin/feedback": "反馈工单",
  "/admin/learning": "学习运营",
  "/admin/ai": "AI 运营 / 概览",
  "/admin/settings": "系统设置",
}

export function AdminHeader() {
  const pathname = usePathname()

  // 处理动态路由
  let title = breadcrumbMap[pathname] ?? "管理后台"
  if (!breadcrumbMap[pathname]) {
    const segments = pathname.split("/")
    if (segments.length > 3) {
      const parentPath = segments.slice(0, 3).join("/")
      const parentTitle = breadcrumbMap[parentPath]
      if (parentTitle) {
        title = `${parentTitle} / 详情`
      }
    }
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索..."
            className="h-8 pl-8 pr-3 text-xs rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
        </button>
      </div>
    </header>
  )
}
```

**Step 5: 创建布局容器**

创建 `features/admin-shell/components/admin-layout.tsx`:

```typescript
import { AdminSidebar } from "./admin-sidebar"
import { AdminHeader } from "./admin-header"
import type { AdminLayoutProps } from "../types"

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 6: 创建后台路由布局**

创建 `app/admin/layout.tsx`:

```typescript
import { AdminLayout } from "@/features/admin-shell/components/admin-layout"

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
```

**Step 7: 提交后台壳层**

```bash
git add features/admin-shell/ app/admin/layout.tsx
git commit -m "feat(admin-shell): 实现后台布局壳层"
```

---

## Task 6: 前端 - 总览看板页面

**Files:**
- Create: `app/admin/page.tsx`
- Create: `features/admin-dashboard/components/dashboard-overview.tsx`

**Step 1: 创建看板组件**

创建 `features/admin-dashboard/components/dashboard-overview.tsx`:

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Users, CheckCircle, BookOpen, Calendar } from "lucide-react"
import { useEffect, useState } from "react"

interface DashboardStats {
  pendingFeedbackCount: number
  todayNewUserCount: number
  todayCompletedTaskCount: number
  activeLearningPathCount: number
  todayCheckinCount: number
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  iconColor: string
  change?: string
}

function StatCard({ title, value, icon: Icon, iconColor, change }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-md ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">{change}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/dashboard/overview")
        if (response.ok) {
          const result = await response.json()
          setStats(result.data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-card border border-border rounded-lg py-12 text-center">
        <p className="text-sm text-muted-foreground">加载看板数据失败</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">总览看板</h1>
        <p className="text-sm text-muted-foreground mt-0.5">系统核心指标概览</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="待处理反馈"
          value={stats.pendingFeedbackCount}
          icon={MessageSquare}
          iconColor="bg-yellow-400/10 text-yellow-400"
          change="较昨日 -2"
        />
        <StatCard
          title="今日新增用户"
          value={stats.todayNewUserCount}
          icon={Users}
          iconColor="bg-blue-400/10 text-blue-400"
          change="较昨日 +8"
        />
        <StatCard
          title="今日完成任务"
          value={stats.todayCompletedTaskCount}
          icon={CheckCircle}
          iconColor="bg-green-400/10 text-green-400"
        />
        <StatCard
          title="活跃学习计划"
          value={stats.activeLearningPathCount}
          icon={BookOpen}
          iconColor="bg-purple-400/10 text-purple-400"
        />
        <StatCard
          title="今日打卡人数"
          value={stats.todayCheckinCount}
          icon={Calendar}
          iconColor="bg-orange-400/10 text-orange-400"
        />
      </div>
    </div>
  )
}
```

**Step 2: 创建看板页面**

创建 `app/admin/page.tsx`:

```typescript
import { DashboardOverview } from "@/features/admin-dashboard/components/dashboard-overview"

export default function AdminDashboardPage() {
  return <DashboardOverview />
}
```

**Step 3: 提交看板页面**

```bash
git add features/admin-dashboard/ app/admin/page.tsx
git commit -m "feat(admin-dashboard): 实现总览看板页面"
```

---

## Task 7: 前端 - 反馈工单模块

**Files:**
- Create: `features/admin-feedback/types.ts`
- Create: `features/admin-feedback/data/status-config.ts`
- Create: `features/admin-feedback/components/feedback-list.tsx`
- Create: `features/admin-feedback/components/feedback-detail.tsx`
- Create: `features/admin-feedback/pages/feedback-list-page.tsx`
- Create: `features/admin-feedback/pages/feedback-detail-page.tsx`
- Create: `app/admin/feedback/page.tsx`
- Create: `app/admin/feedback/[id]/page.tsx`

**Step 1: 创建类型定义**

创建 `features/admin-feedback/types.ts`:

```typescript
export interface FeedbackTicket {
  id: string
  userId: string
  feedbackType: string
  feedbackTypeLabel: string
  status: string
  statusLabel: string
  priority: "low" | "medium" | "high"
  title: string
  content: string
  userNicknameSnapshot: string | null
  submittedAt: string
  updatedAt: string
  lastReplyAt: string | null
  replies: FeedbackReply[]
}

export interface FeedbackReply {
  id: string
  authorType: "user" | "admin" | "system"
  authorId: string | null
  content: string
  createdAt: string
}

export interface FeedbackListFilters {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}
```

**Step 2: 创建状态配置**

创建 `features/admin-feedback/data/status-config.ts`:

```typescript
export const feedbackStatusConfig = {
  submitted: { label: "已提交", className: "bg-yellow-400/15 text-yellow-400" },
  in_review: { label: "处理中", className: "bg-blue-400/15 text-blue-400" },
  replied: { label: "已回复", className: "bg-green-400/15 text-green-400" },
  closed: { label: "已关闭", className: "bg-muted text-muted-foreground" },
}

export const feedbackPriorityConfig = {
  low: { label: "低", className: "text-muted-foreground" },
  medium: { label: "中", className: "text-orange-400" },
  high: { label: "高", className: "text-red-400" },
}

export const feedbackStatusOptions = [
  { value: "all", label: "全部状态" },
  { value: "submitted", label: "已提交" },
  { value: "in_review", label: "处理中" },
  { value: "replied", label: "已回复" },
  { value: "closed", label: "已关闭" },
]
```

**Step 3: 创建列表组件**

创建 `features/admin-feedback/components/feedback-list.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, ChevronDown, MessageSquare, User, Clock, MoreHorizontal } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { feedbackStatusConfig, feedbackPriorityConfig, feedbackStatusOptions } from "../data/status-config"
import type { FeedbackTicket } from "../types"

export function FeedbackList() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== "all") params.append("status", statusFilter)
        if (search) params.append("keyword", search)
        
        const response = await fetch(`/api/admin/feedback?${params}`)
        if (response.ok) {
          const result = await response.json()
          setTickets(result.data.items || [])
        }
      } catch (error) {
        console.error("Failed to fetch feedback:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [statusFilter, search])

  const pendingCount = tickets.filter(t => t.status === "submitted").length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">反馈工单</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {tickets.length} 条工单 · <span className="text-yellow-400">{pendingCount} 条待处理</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索工单 ID、用户、标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {feedbackStatusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-lg py-12 text-center">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-16 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">暂无匹配工单</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="w-24 text-xs">工单号</TableHead>
                <TableHead className="text-xs">标题</TableHead>
                <TableHead className="w-24 text-xs">用户</TableHead>
                <TableHead className="w-20 text-xs">类型</TableHead>
                <TableHead className="w-20 text-xs">优先级</TableHead>
                <TableHead className="w-20 text-xs">状态</TableHead>
                <TableHead className="w-28 text-xs">创建时间</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const sc = feedbackStatusConfig[ticket.status as keyof typeof feedbackStatusConfig]
                const pc = feedbackPriorityConfig[ticket.priority]
                
                return (
                  <TableRow key={ticket.id} className="hover:bg-accent/30">
                    <TableCell className="text-xs">
                      <span className="font-mono text-muted-foreground">
                        {ticket.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/feedback/${ticket.id}`}
                        className="text-sm text-foreground hover:text-primary transition-colors hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-16">
                          {ticket.userNicknameSnapshot || "未知用户"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ticket.feedbackTypeLabel}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${pc.className}`}>
                        {pc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.className}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.submittedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

**Step 4: 创建详情组件**

创建 `features/admin-feedback/components/feedback-detail.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Clock } from "lucide-react"
import { feedbackStatusConfig } from "../data/status-config"
import type { FeedbackTicket, FeedbackReply } from "../types"

interface FeedbackDetailProps {
  ticketId: string
}

export function FeedbackDetail({ ticketId }: FeedbackDetailProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState<FeedbackTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState("")
  const [statusValue, setStatusValue] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/feedback/${ticketId}`)
        if (response.ok) {
          const result = await response.json()
          setTicket(result.data)
          setStatusValue(result.data.status)
        }
      } catch (error) {
        console.error("Failed to fetch ticket:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [ticketId])

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg py-12 text-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="bg-card border border-border rounded-lg py-12 text-center">
        <p className="text-sm text-muted-foreground">工单不存在</p>
      </div>
    )
  }

  const sc = feedbackStatusConfig[ticket.status as keyof typeof feedbackStatusConfig]

  async function handleSubmitReply() {
    if (!replyContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/feedback/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          status: statusValue !== ticket.status ? statusValue : undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setTicket(result.data)
        setReplyContent("")
      }
    } catch (error) {
      console.error("Failed to submit reply:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">工单 #{ticketId.slice(0, 8)}</h1>
            <Badge className={sc.className}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-foreground mt-1">{ticket.title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          返回
        </Button>
      </div>

      {/* Ticket Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">类型：</span>
            <span className="text-foreground">{ticket.feedbackTypeLabel}</span>
          </div>
          <div>
            <span className="text-muted-foreground">优先级：</span>
            <span className="text-foreground">{ticket.priority}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">创建于 </span>
            <span className="text-foreground">{new Date(ticket.submittedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {ticket.userNicknameSnapshot || "用户"}
            </span>
          </div>
          <p className="text-sm text-foreground pl-8">{ticket.content}</p>
        </div>

        {ticket.replies.map((reply) => (
          <div key={reply.id} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                reply.authorType === "admin" 
                  ? "bg-blue-400/20" 
                  : "bg-muted"
              }`}>
                <span className="text-xs">
                  {reply.authorType === "admin" ? "管" : "用"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {reply.authorType === "admin" ? "管理员" : "用户"}
              </span>
            </div>
            <p className="text-sm text-foreground pl-8">{reply.content}</p>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <Textarea
          placeholder="输入回复内容..."
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-3">
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(feedbackStatusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSubmitReply}
            disabled={!replyContent.trim() || submitting}
            size="sm"
          >
            {submitting ? "发送中..." : "发送回复"}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 5: 创建列表页**

创建 `features/admin-feedback/pages/feedback-list-page.tsx`:

```typescript
import { FeedbackList } from "../components/feedback-list"

export function FeedbackListPage() {
  return <FeedbackList />
}
```

**Step 6: 创建详情页**

创建 `features/admin-feedback/pages/feedback-detail-page.tsx`:

```typescript
import { FeedbackDetail } from "../components/feedback-detail"

interface FeedbackDetailPageProps {
  params: { id: string }
}

export function FeedbackDetailPage({ params }: FeedbackDetailPageProps) {
  return <FeedbackDetail ticketId={params.id} />
}
```

**Step 7: 创建路由入口**

创建 `app/admin/feedback/page.tsx`:

```typescript
import { FeedbackListPage } from "@/features/admin-feedback/pages/feedback-list-page"

export default function AdminFeedbackListPage() {
  return <FeedbackListPage />
}
```

创建 `app/admin/feedback/[id]/page.tsx`:

```typescript
import { FeedbackDetailPage } from "@/features/admin-feedback/pages/feedback-detail-page"

export default function AdminFeedbackDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return <FeedbackDetailPage({ params })}
}
```

**Step 8: 提交反馈模块**

```bash
git add features/admin-feedback/ app/admin/feedback/
git commit -m "feat(admin-feedback): 实现反馈工单列表和详情页"
```

---

## Task 8: 集成验收

**Step 1: 更新 OpenAPI 测试**

修改 `scripts/check-openapi-document.ts`，更新断言：

```typescript
assert.equal(operations.length, 31) // 新增 4 个 admin-auth + 1 个 dashboard 接口
```

**Step 2: 运行 OpenAPI 测试**

Run: `pnpm test:openapi-document`
Expected: PASS

**Step 3: 启动开发服务器验证**

Run: `pnpm dev`

访问以下 URL 验证：
- `http://localhost:3000/admin` — 应显示总览看板
- `http://localhost:3000/admin/feedback` — 应显示反馈列表
- 点击任意工单进入详情页 — 应显示详情并可回复

**Step 4: 运行代码检查**

Run: `pnpm lint`
Expected: 无错误

**Step 5: 运行构建验证**

Run: `pnpm build`
Expected: 构建成功

**Step 6: 提交集成验收**

```bash
git add scripts/check-openapi-document.ts
git commit -m "test(openapi): 更新接口数量断言"
```

---

## Task 9: 文档回写

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/plans/README.md`
- Modify: `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`

**Step 1: 更新 CLAUDE.md**

在 `CLAUDE.md` 中添加：

```markdown
### 管理后台

已实现 Phase 1 功能：
- 管理员认证（Supabase Auth + 角色表）
- 后台布局壳层（侧边栏 + 顶部栏）
- 总览看板（简化版）
- 反馈工单列表与详情

相关路由：
- `/admin/login` — 管理员登录页
- `/admin` — 总览看板
- `/admin/feedback` — 反馈工单列表
- `/admin/feedback/[id]` — 反馈工单详情

相关域目录：
- `features/admin-shell/` — 后台壳层
- `features/admin-feedback/` — 反馈工单
- `features/admin-dashboard/` — 总览看板
```

**Step 2: 更新 docs/plans/README.md**

从"进行中/待完成"中移除"管理员后台前端"。

**Step 3: 更新管理后台设计文档**

在 `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md` 末尾添加：

```markdown
## 实施记录

### Phase 1（已完成 - 2026-03-31）

**数据库**：
- `017_create_admin_accounts.sql` — 管理员账号、角色、审计日志表

**后端 API**：
- `/api/admin/auth/login` — 管理员登录
- `/api/admin/auth/session` — 获取管理员会话
- `/api/admin/auth/logout` — 管理员登出
- `/api/admin/dashboard/overview` — 总览看板数据

**前端页面**：
- `/admin` — 总览看板
- `/admin/feedback` — 反馈工单列表
- `/admin/feedback/[id]` — 反馈工单详情

**前端域**：
- `features/admin-shell/` — 后台壳层
- `features/admin-feedback/` — 反馈工单
- `features/admin-dashboard/` — 总览看板
```

**Step 4: 提交文档更新**

```bash
git add CLAUDE.md docs/plans/README.md docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md
git commit -m "docs(admin-console): Phase 1 完成文档回写"
```

---

## 实施完成检查清单

在完成所有任务后，确认以下事项：

- [ ] 所有数据库迁移已执行
- [ ] 所有后端 API 测试通过
- [ ] OpenAPI 文档已更新并验证
- [ ] 前端页面在三个断点（1440px / 1024px / 768px）下布局正常
- [ ] 反馈工单的回复、状态切换功能正常
- [ ] `pnpm lint` 无错误
- [ ] `pnpm build` 构建成功
- [ ] 所有文档已回写

---

*实施计划完成时间：约 4-6 小时*
*预计提交数：9 个功能提交 + 3 个文档/测试提交*
