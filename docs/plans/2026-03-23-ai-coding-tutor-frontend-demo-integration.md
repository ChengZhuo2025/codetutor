# AI编程学习教练 前端 Demo 接入说明

> 文档类型：前端接入说明
> 产品名称：AI编程学习教练
> 版本：v1.0
> 状态：已执行
> 创建日期：2026-03-23
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`、`docs/plans/2026-03-23-ai-coding-tutor-frontend-structure-design.md`

---

## 1. 接入目标

将已有前端演示 demo 直接作为当前仓库的首版 Web 工程基座接入，优先保留已完成的页面、视觉语言和交互骨架，避免重复搭建。

本次接入目标不是立即把所有代码重构成最终目录结构，而是先完成：

- 仓库从文档仓升级为可运行的 Next.js 前端工程
- 现有 Landing、登录、Onboarding、学习、地图、成就页可以继续复用
- 与现有 PRD、技术架构、页面原型文档保持基本一致

---

## 2. 已接入内容

当前仓库根目录已接入以下前端工程能力：

- `app/`：App Router 页面入口
- `components/`：现有复用组件与 UI 组件
- `hooks/`：全局 hooks
- `lib/`：底层工具方法
- `public/`：静态资源
- `package.json`、`tsconfig.json`、`postcss.config.mjs`、`next.config.mjs`：工程配置

页面与原型文档的对应关系如下：

- `/`：Landing Page
- `/login`：登录页
- `/onboarding`：新手欢迎与工具选择
- `/learn`：学习主界面
- `/map`：闯关地图
- `/achievements`：成就中心

---

## 3. 当前接入策略

本次采用“先迁入、后归整”的策略。

原因：

- 演示 demo 本身已经符合 `Next.js App Router + React 19 + Tailwind CSS 4 + shadcn/ui` 技术方向
- 当前仓库原本没有前端工程骨架，直接迁入比重新搭建成本更低
- 现阶段优先目标是保留 PRD 对应页面和视觉效果，而不是立即做大规模目录重构

因此，当前仍保留：

- `components/landing/*`
- `components/learn/*`

它们后续会逐步迁移到：

- `features/marketing/*`
- `features/learning/*`

---

## 4. 本次同步调整

为了让 demo 更适合作为正式项目起点，本次同步做了最小必要清理：

- 移除了 `app/layout.tsx` 中的 `v0.app` 生成器标记
- 移除了 `next.config.mjs` 中忽略 TypeScript 构建错误的配置
- 将 `package.json` 项目名改为 `code-tutor`
- 补充了 ESLint 基础配置，便于后续工程化维护
- 清理了 `.gitignore` 中仅属于演示沙箱环境的条目

---

## 5. 后续建议

建议按下面顺序继续演进：

1. 先完成依赖安装与首轮构建验证，确保当前页面可正常运行。
2. 引入 `features/marketing` 与 `features/learning`，把业务组件从 `components/` 逐步迁出。
3. 为登录、Onboarding、学习主界面补充真实数据接线，接入后端 BFF。
4. 补齐 `providers/`、`types/`、`constants/`、`tests/` 等目录，向前端结构设计文档收敛。

在没有真实 API 之前，建议继续保留 demo 中的静态假数据，用于推进前端开发和交互验证。
