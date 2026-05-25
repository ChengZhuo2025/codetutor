# [2026-05-25 00:00] 用户端 onboarding 移动端优化

## 状态总览

| 任务 | 状态 | 验证结果 |
| ---- | ---- | -------- |
| Review /onboarding 手机端体验 | 完成 | 已用 390x844 移动端视口检查 |
| 优化 /onboarding 手机端布局与交互 | 完成 | 新增 `pnpm test:onboarding-mobile`，360x800 / 390x844 浏览器验证与构建验证通过 |

## 详细记录

### 1. 需求与决策记录

- 用户要求基于 review 直接优化用户端 `/onboarding` 手机端界面。
- 保持 web 端已确定样式和内容，移动端单独优化信息密度、滚动和 CTA 可达性。
- 采用保守方案：桌面端保留三步横向滑动；移动端压缩卡片密度、使用页面纵向滚动、底部 CTA sticky，并隐藏非当前步骤的辅助技术可见性。

### 2. 执行计划

1. 修复非当前步骤可访问性暴露 -> 验证：源码检查 `aria-hidden` / `inert`。
2. 优化第 1 步工具选择手机端密度与 CTA 可达性 -> 验证：移动端截图和脚本检查。
3. 优化第 3 步路线选择手机端滚动与信息层级 -> 验证：移动端截图和脚本检查。
4. 运行相关验证 -> 验证：新增脚本、主题表面检查、lint。

### 3. 实施进度

- [x] [00:00] 完成 review 并确认 390x844 下第 1 步过长、第 3 步内层滚动和非当前步骤可访问性暴露问题。
- [x] [00:00] 实施组件优化。
- [x] [00:00] 运行验证并检查 diff。

### 4. 测试与问题

- `node scripts/check-onboarding-mobile-ux.mjs` 通过。
- `pnpm test:onboarding-mobile` 通过。
- `pnpm lint` 通过；存在既有 warning：`features/marketing/components/nav.tsx` 中 `Sparkles` 未使用。
- `pnpm build` 通过；构建中仅出现 Node `module.register()` 废弃警告，未阻断编译。
- 浏览器移动端验证：390x844 下第 1 步 CTA 已进入首屏吸底区域；无障碍树只暴露当前步骤；第 3 步 CTA 保持可见，路线区改为页面主滚动，不再依赖手机端固定 46vh 内层滚动。
- 浏览器移动端验证：360x800 下第 1 步无横向溢出，正文只包含当前步骤，CTA 在底部可见；走到第 3 步后仍无横向溢出，正文只包含第 3 步，CTA 与返回按钮都在可见区域。
- 曾尝试补 TSX 静态渲染脚本，但当前仓库没有 TSX 组件运行器，Node 无法直接导入 `.tsx`；已移除不可执行脚本，保留可稳定运行的源码结构检查 + 浏览器验证。
- `pnpm test:user-theme-surfaces` 当前失败于 `components/layout/notification-detail-dialog.tsx` 缺少 `DIALOG_PANEL_CLASS`，为仓库既有问题，与本次 `/onboarding` 修改无直接关系。
