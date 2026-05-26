# [2026-05-26 00:00] 用户端 achievements 移动端优化

## 状态总览

| 任务 | 状态 | 验证结果 |
| ---- | ---- | -------- |
| Review `/achievements` 手机端样式 | 完成 | 识别 6 个与 `/learn`、`/map` 不一致的问题 |
| 修复移动端壳层与标题区 | 完成 | `pnpm test:achievements-page` 覆盖 minimal nav、隐藏 brand、compact sheet、默认收起标题区 |
| 修复主段位卡与信息密度 | 完成 | `pnpm test:achievements-page` 覆盖移动端纵向主卡、满宽 44px CTA、紧凑段位 stepper |
| 修复统计卡与打卡日历 | 完成 | `pnpm test:achievements-page` 覆盖 2 列统计、打卡按钮触控高度、日历紧凑间距 |
| 细化段位卡与徽章区 | 完成 | `pnpm test:achievements-page` 覆盖段位信息左右布局、徽章手机端两列布局 |
| 完整验证 | 通过 | `pnpm test:achievements-page`、`pnpm test:workspace-shell-collapse`、`pnpm lint`、`pnpm build`、`git diff --check` 通过 |

## 详细记录

### 1. 需求与决策记录

- 用户要求修复 `/achievements` 手机端样式 review 中的 6 个问题。
- 目标是让 `/achievements` 与已优化的 `/learn`、`/map` 在移动端壳层、标题密度、卡片布局、触控目标和信息密度上保持一致。
- 当前 DevTools 浏览器会话未登录，成功态页面实测会被重定向到 `/login`，因此本轮以源码断言、lint、build 为主要验证。

### 2. 实施进度

- [x] 更新 `scripts/check-achievements-page.mjs`，先确认旧实现因缺少 `/learn` 同款 minimal mobile nav 失败。
- [x] `/achievements` 成功态和非成功态 AppShell 对齐 minimal mobile nav、隐藏移动端 brand、compact sheet。
- [x] 顶部标题区标题改为移动端 `text-xl`，增加默认收起的展开/收起按钮。
- [x] 主段位卡移动端改为纵向布局，段位图标外壳缩小，两个 CTA 改为满宽 44px 触控目标。
- [x] 段位提升进程移动端改为紧凑 5 列 stepper，并保留连接线。
- [x] 成就统计和打卡统计移动端改为 2 列，日历间距和圆角收紧，打卡按钮保证 44px 触控高度。
- [x] 当前段位卡片中图标、段位名称和讲解文字改为手机端左右布局。
- [x] 成就徽章区手机端从通栏上下布局改为一行两列，并同步收紧卡片内边距和图标容器。

### 3. 测试与问题

- `pnpm test:achievements-page`：通过。
- `pnpm test:workspace-shell-collapse`：通过。
- `git diff --check`：通过。
- `pnpm lint`：通过，仅保留既有 warning：`features/marketing/components/nav.tsx` 的 `Sparkles` 未使用。
- `pnpm build`：通过；构建中出现既有 Node `module.register()` deprecation warning，不阻断。
- 未触碰用户已有无关改动：`components/ui/input.tsx`、`components/ui/textarea.tsx`。
