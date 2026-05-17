# 统一登录注册流程设计

**日期：** 2026-05-17  
**状态：** 已确认，已实施

## 背景

原有登录/注册流程以 tab 分隔，体验割裂：
- 登录时输入手机号会先检测注册状态，未注册则自动跳转注册 tab
- OAuth 扫码未绑定手机时拦截并要求绑定，流程不连贯
- 前端维护了 `AuthMode = "login" | "register"` 双态，逻辑复杂

## 目标

实现"登录即注册"：去掉注册 tab，统一入口，已注册走登录流程，未注册自动完成注册。

## 核心发现

服务端 `finalizeAuthLogin` 已经是"登录即注册"逻辑——用户不存在时自动创建 profile。  
前端的注册状态检查是多余的拦截，去掉即可。

## 新状态机

```
AuthStep = "idle" | "oauth-binding"
```

- `idle`：默认态，显示手机号表单 + OAuth 按钮
- `oauth-binding`：OAuth 扫码后无手机号，显示手机绑定表单 + 说明文案

替代原来的 `AuthMode = "login" | "register"`。

## 手机号流程

```
输入手机号 → 勾选协议 → 发送验证码（无注册状态检查）
    ↓
Supabase signInWithOtp({ shouldCreateUser: true })
    ↓
输入验证码 → verifyOtp → POST /api/auth/login
    ↓
finalizeAuthLogin
    ├── 已有 profile → 更新 last_login_at → 跳转 /learn 或 /history
    └── 无 profile   → 创建 profile + preferences → 跳转 /onboarding
```

## OAuth 扫码流程

**场景 A：已绑定手机的用户**
```
扫码 → callback → finalizeAuthLogin → 跳转
```

**场景 B：新用户首次扫码（无手机）**
```
扫码 → callback 检测无手机 → codetutor.oauth.binding_required
    ↓
清理临时 OAuth session，step 切换为 "oauth-binding"，显示绑定提示
    ↓
输入手机 → 再次确认清理临时 OAuth session → 验证码 → verifyOtp → startOAuthLink → linkIdentity
    ↓
codetutor.oauth.linked → 跳转
```

**场景 C：已有手机账号，首次用 OAuth 扫码**
```
扫码 → Supabase 创建临时 OAuth 用户 → binding_required
    ↓
清理临时 OAuth session → 输入已有手机号 → 验证码 → 登录为手机用户
    ↓
linkIdentity 把 OAuth identity 挂到手机用户
    ↓
discardOAuthTempUser 清理临时用户 → 跳转
```

## 用户同一性判断

依赖 Supabase identity 机制：一个 `auth.users` 记录可挂多个 identity。

```
auth.users (user_id)
    ├── identity: phone  (+86 138xxxx)
    ├── identity: wechat (openid_xxx)
    └── identity: douyin (openid_yyy)
```

手机号在 Supabase 里唯一。只要两种登录方式最终绑定同一手机号，就是同一 `user_id`。

## 改动范围

### 前端（主要改动）

| 文件 | 改动 |
|------|------|
| `features/auth/types.ts` | 删除 `AuthMode`，新增 `AuthStep` |
| `features/auth/pages/login-page.tsx` | 删除注册检查逻辑约 80 行，简化状态 |
| `features/auth/components/login-form.tsx` | 删除 tab UI，统一文案，OAuth 始终显示 |

### 后端与客户端错误处理

- `finalizeAuthLogin` 已支持登录即注册。
- `/api/auth/login` 会在 route 层拦截 OAuth-only 且无手机号 identity 的 Supabase session，即使客户端误传 `loginType: "phone"` 也返回 `OAUTH_PHONE_BINDING_REQUIRED`，避免未绑定扫码账号创建业务资料。
- API client 的 `unwrapResponse` 会抛出带 `code` 的 `ApiError`，OAuth callback 使用结构化错误码判断手机号绑定流程，不再只依赖中文错误文案。
- `/api/auth/phone-status` 保留接口，前端不再调用。
- Supabase session 创建成功但应用登录 finalize 失败时，前端会清理本地 Supabase session 和业务 session cookie。
- OAuth 未绑定手机号时，父登录页收到 `codetutor.oauth.binding_required` 后会立即清理临时 OAuth session；绑定态发送手机号验证码前也会再次清理，确保短信 OTP 走普通手机号登录/注册链路，而不是夹带上一次扫码登录留下的本地状态。

### 预计净变化

删除约 100 行，新增约 20 行（`oauth-binding` 态提示文案）。
