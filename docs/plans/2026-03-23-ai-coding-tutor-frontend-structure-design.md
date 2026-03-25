# AI编程学习教练 前端目录结构设计文档

> 文档类型：前端目录结构设计文档  
> 产品名称：AI编程学习教练  
> 版本：v1.0  
> 状态：初稿  
> 创建日期：2026-03-23  
> 适用阶段：MVP  
> 关联文档：`docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md`

---

## 1. 文档目标

本文档用于定义 AI编程学习教练 Web 前端项目的目录结构、模块划分、命名规则和职责边界，作为前端工程初始化、多人协作和后续扩展的统一规范。

本设计默认基于：

- Next.js 16 App Router
- React 19.2
- TypeScript 5.9
- Tailwind CSS 4
- shadcn/ui
- Node.js 24 Active LTS

---

## 2. 设计目标

前端目录结构需要满足以下目标：

1. 业务模块清晰，避免页面、组件、请求逻辑混杂。
2. 高频共享组件集中管理，避免散落复制。
3. 页面域与业务域对齐，方便多人协作。
4. 与后端 API 和技术架构文档保持一致。
5. 为后续支付、社区、移动适配和更多工具路径扩展保留空间。

---

## 3. 目录设计原则

### 3.1 页面入口与业务实现分离

- `app/` 只放路由入口、layout、page 和极薄的页面装配逻辑
- 业务 UI 与逻辑放在 `features/`

### 3.2 通用能力集中，业务能力按域拆分

- 通用 UI、hooks、工具函数、API client 不与业务功能混写
- 业务域按 `marketing / auth / onboarding / learning / progress / achievement / history` 拆分

### 3.3 页面专属组件不进入全局组件库

- 只在一个页面使用的组件放在对应 feature 内
- 真正跨页面复用的组件才进入 `components/`

### 3.4 状态归属清晰

- 服务端权威状态来自 API
- 前端只保留 UI 状态和必要缓存

### 3.5 目录名优先表达职责，不表达技术细节

应使用：

- `features/learning`
- `lib/api`
- `components/ui`

不建议使用：

- `misc`
- `temp`
- `utils2`

---

## 4. 推荐顶层目录结构

```text
frontend/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── providers/
├── styles/
├── types/
├── constants/
├── tests/
└── public/
```

若项目不拆单独 `frontend/` 根目录，则以下结构默认在仓库根目录直接展开。

---

## 5. 顶层目录说明

## 5.1 `app/`

用途：

- Next.js App Router 路由入口

只应包含：

- `layout.tsx`
- `page.tsx`
- 路由级 `loading.tsx`
- 路由级 `error.tsx`
- 路由级 `not-found.tsx`
- 极薄的页面组装逻辑

不应包含：

- 大量业务组件
- API 请求细节
- 复杂状态机

## 5.2 `components/`

用途：

- 跨业务域共享组件

建议拆分：

- `components/ui`
- `components/layout`
- `components/shared`

## 5.3 `features/`

用途：

- 按业务域组织前端实现

这是前端主工作目录。

## 5.4 `hooks/`

用途：

- 全局复用 hooks

只放跨多个 feature 复用的 hook。

## 5.5 `lib/`

用途：

- 框架无关的底层工具能力

建议拆分：

- `lib/api`
- `lib/auth`
- `lib/analytics`
- `lib/formatters`
- `lib/validators`

## 5.6 `providers/`

用途：

- React Context Provider 和全局注入逻辑

例如：

- `session-provider`
- `theme-provider`
- `query-provider`

## 5.7 `styles/`

用途：

- 全局样式、token、主题变量

## 5.8 `types/`

用途：

- 全局通用类型定义

## 5.9 `constants/`

用途：

- 常量、枚举映射、埋点事件名等

## 5.10 `tests/`

用途：

- 跨 feature 的测试辅助和 E2E 配置

---

## 6. 路由结构设计

建议路由目录如下：

```text
app/
├── (marketing)/
│   ├── layout.tsx
│   └── page.tsx
├── login/
│   └── page.tsx
├── welcome/
│   └── page.tsx
├── learn/
│   └── page.tsx
├── map/
│   └── page.tsx
├── achievements/
│   └── page.tsx
├── history/
│   └── page.tsx
├── layout.tsx
├── error.tsx
└── globals.css
```

说明：

- `(marketing)` 使用 route group，避免 URL 层级污染
- 应用页和营销页共享顶层 App Router，但布局可分离

---

## 7. `features/` 业务域设计

推荐结构：

```text
features/
├── marketing/
├── auth/
├── onboarding/
├── learning/
├── progress/
├── achievement/
├── history/
└── analytics/
```

每个业务域建议按统一模板组织：

```text
features/learning/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
├── utils/
└── index.ts
```

说明：

- `components/`：业务域内部组件
- `hooks/`：业务域内部 hooks
- `services/`：前端调用 API 的封装
- `schemas/`：表单与数据结构校验
- `types/`：业务域本地类型
- `utils/`：仅该域使用的工具函数

---

## 8. 各业务域细化建议

## 8.1 `features/marketing`

职责：

- Landing Page 相关 UI

建议结构：

```text
features/marketing/
├── components/
│   ├── hero-section.tsx
│   ├── how-it-works.tsx
│   ├── target-users.tsx
│   ├── tool-ecosystem.tsx
│   └── final-cta.tsx
├── hooks/
├── services/
└── index.ts
```

## 8.2 `features/auth`

职责：

- 登录页 UI
- 登录态校验
- 会话状态读取

建议结构：

```text
features/auth/
├── components/
│   ├── login-form.tsx
│   ├── login-card.tsx
│   └── auth-guard.tsx
├── hooks/
│   ├── use-session.ts
│   └── use-auth-redirect.ts
├── services/
│   └── auth-client.ts
├── types/
└── index.ts
```

## 8.3 `features/onboarding`

职责：

- 欢迎页
- 工具选择页
- 用户等级分层

建议结构：

```text
features/onboarding/
├── components/
│   ├── welcome-header.tsx
│   ├── level-selector.tsx
│   ├── learning-path-selector.tsx
│   ├── tool-card.tsx
│   ├── tool-grid.tsx
│   └── self-study-card.tsx
├── hooks/
│   └── use-tool-selection.ts
├── services/
│   └── onboarding-client.ts
├── schemas/
│   └── onboarding-schema.ts
└── index.ts
```

## 8.4 `features/learning`

职责：

- 学习主界面
- 对话消息流
- 输入区
- 快捷操作
- 当前任务上下文

这是最核心业务域。

建议结构：

```text
features/learning/
├── components/
│   ├── learning-shell.tsx
│   ├── learning-sidebar.tsx
│   ├── task-header.tsx
│   ├── message-list.tsx
│   ├── message-bubble-ai.tsx
│   ├── message-bubble-user.tsx
│   ├── message-bubble-system.tsx
│   ├── quick-actions.tsx
│   ├── learning-input.tsx
│   ├── right-panel-current-step.tsx
│   ├── stuck-help-modal.tsx
│   └── completion-modal.tsx
├── hooks/
│   ├── use-current-session.ts
│   ├── use-learning-message.ts
│   ├── use-task-completion.ts
│   ├── use-stuck-help.ts
│   └── use-session-resume.ts
├── services/
│   └── learning-client.ts
├── schemas/
│   ├── message-input-schema.ts
│   └── stuck-help-schema.ts
├── types/
│   └── learning.types.ts
├── utils/
│   └── message-formatter.ts
└── index.ts
```

## 8.5 `features/progress`

职责：

- 闯关地图
- 当前进度概览

建议结构：

```text
features/progress/
├── components/
│   ├── map-view.tsx
│   ├── map-node.tsx
│   ├── map-detail-panel.tsx
│   └── progress-summary.tsx
├── hooks/
│   └── use-progress-map.ts
├── services/
│   └── progress-client.ts
└── index.ts
```

## 8.6 `features/achievement`

职责：

- 成就页
- 学分和段位展示

建议结构：

```text
features/achievement/
├── components/
│   ├── achievement-header.tsx
│   ├── rank-card.tsx
│   ├── score-summary.tsx
│   ├── skill-tag-matrix.tsx
│   └── achievement-list.tsx
├── hooks/
│   └── use-achievement-summary.ts
├── services/
│   └── achievement-client.ts
└── index.ts
```

## 8.7 `features/history`

职责：

- 历史记录抽屉
- 历史页

建议结构：

```text
features/history/
├── components/
│   ├── history-drawer.tsx
│   ├── history-item.tsx
│   └── history-empty.tsx
├── hooks/
│   └── use-recent-history.ts
├── services/
│   └── history-client.ts
└── index.ts
```

## 8.8 `features/analytics`

职责：

- 前端埋点触发

建议结构：

```text
features/analytics/
├── hooks/
│   └── use-track-event.ts
├── services/
│   └── analytics-client.ts
└── index.ts
```

---

## 9. `components/` 共享组件结构

建议结构：

```text
components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx
│   └── skeleton.tsx
├── layout/
│   ├── app-header.tsx
│   ├── app-sidebar.tsx
│   ├── marketing-header.tsx
│   └── page-container.tsx
└── shared/
    ├── empty-state.tsx
    ├── error-state.tsx
    ├── loading-state.tsx
    ├── score-badge.tsx
    ├── rank-badge.tsx
    └── tool-chip.tsx
```

规则：

- `ui/` 只放通用原子组件
- `layout/` 只放框架组件
- `shared/` 放跨业务域复用的中级组件

---

## 10. `lib/` 底层能力结构

建议结构：

```text
lib/
├── api/
│   ├── client.ts
│   ├── request.ts
│   ├── response.ts
│   └── errors.ts
├── auth/
│   ├── session.ts
│   └── guards.ts
├── analytics/
│   └── track.ts
├── formatters/
│   ├── date.ts
│   └── score.ts
├── validators/
│   └── common.ts
└── utils/
    ├── cn.ts
    └── invariant.ts
```

说明：

- `lib/api/client.ts` 负责底层请求封装
- 业务域不要直接在组件中手写 `fetch`

---

## 11. Hooks 设计原则

## 11.1 全局 hooks 放 `hooks/`

例如：

```text
hooks/
├── use-mobile.ts
├── use-debounce.ts
├── use-toast.ts
└── use-local-storage.ts
```

## 11.2 业务 hooks 放 feature 内

例如：

- `features/learning/hooks/use-learning-message.ts`
- `features/onboarding/hooks/use-tool-selection.ts`

规则：

- 仅一个域使用的 hook 不进入全局 `hooks/`

---

## 12. Types 与 Constants 设计

建议结构：

```text
types/
├── api.ts
├── common.ts
└── analytics.ts

constants/
├── routes.ts
├── analytics-events.ts
├── ranks.ts
└── tools.ts
```

规则：

- 通用类型进 `types/`
- 业务域私有类型优先留在 feature 内

---

## 13. 文件命名规范

### 13.1 文件命名

建议使用 kebab-case：

- `tool-card.tsx`
- `use-current-session.ts`
- `learning-client.ts`

### 13.2 组件命名

组件导出使用 PascalCase：

- `ToolCard`
- `LearningInput`

### 13.3 Hook 命名

- `useXxx`

### 13.4 避免命名

- `index2.ts`
- `helper.ts`
- `temp.tsx`

---

## 14. 前端推荐目录树

```text
app/
├── (marketing)/
│   ├── layout.tsx
│   └── page.tsx
├── achievements/
│   └── page.tsx
├── history/
│   └── page.tsx
├── learn/
│   └── page.tsx
├── login/
│   └── page.tsx
├── map/
│   └── page.tsx
├── welcome/
│   └── page.tsx
├── error.tsx
├── globals.css
└── layout.tsx

components/
├── layout/
├── shared/
└── ui/

features/
├── achievement/
├── analytics/
├── auth/
├── history/
├── learning/
├── marketing/
├── onboarding/
└── progress/

hooks/
lib/
providers/
styles/
types/
constants/
tests/
public/
```

---

## 15. 不建议的做法

- 在 `app/page.tsx` 中写完整业务页面实现
- 在组件中直接请求多个接口并组装业务状态
- 所有组件都塞进 `components/`
- 用单个 `store` 承载全部业务权威状态
- 在不同 feature 内复制同一个 API 请求逻辑

---

## 16. 演进建议

当产品规模扩大后，可进一步演进：

- 为复杂业务域增加 `state/` 目录
- 将 `services/` 与 `mappers/` 分离
- 为高频复用 UI 单独抽出 `design-system` 包

但 MVP 阶段不建议过度抽象。

---

## 17. 结论

这套前端目录结构的核心思路，是让 Next.js 路由层足够薄，让业务域在 `features/` 内自洽，让共享能力集中而克制。只要页面入口、业务域、共享组件和底层能力四层边界清楚，前端工程在 MVP 迭代中就能保持速度和可维护性。
