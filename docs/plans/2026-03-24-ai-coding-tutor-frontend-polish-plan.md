# AI Coding Tutor Frontend Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不接入真实后端的前提下，把当前 6 个前端 demo 页面从“可运行 demo”打磨到“可继续内测和联调的高质量前端壳层”。

**Architecture:** 以现有 `features/` 领域拆分为基础，不改页面域边界，优先补齐全局壳层、响应式布局、统一视觉 token、反馈状态与 API-ready 的前端契约层。保留当前静态数据驱动方式，但将页面数据逐步收口为可替换的 contract-shaped mock adapter，避免未来接接口时再做第二次大规模重构。

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Vercel Analytics

---

## 0. 背景结论

当前实现已经满足以下基础条件：

- 6 个页面都已落位到 `features/marketing`、`features/auth`、`features/onboarding`、`features/learning`、`features/progress`、`features/achievement`
- `app/` 已经是薄路由包装层
- 顶层共享层 `constants/`、`providers/`、`types/` 已建立
- `pnpm lint` 与 `pnpm build` 当前通过

当前最值得优先处理的问题：

1. 已登录态页面缺少统一壳层，学习页、地图页、成就页仍有布局复用不完整的问题。
2. 移动端适配明显不足，`/learn` 在窄屏下仍保留三栏并排，实际不可用。
3. 页面仍主要依赖本地静态数组，尚未形成面向 API 规范的前端契约层。
4. 全局 Loading / Error / Empty / Success 反馈还没有统一模式。
5. 视觉基调已基本贴近设计稿，但排版层级、动效节奏、状态反馈和 CTA 强弱还有提升空间。

---

### Task 1: 补齐前端打磨基线与全局设计 token

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `constants/app.ts`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md`

**Step 1: 对齐视觉规范中的全局 token**

- 将当前深色主题 token 与视觉规范中的语义层重新对照。
- 保留现有暗色基调和青绿色品牌色，不做风格推倒重来。
- 明确补齐以下层级：
  - 页面背景层
  - 卡片层级
  - 品牌高亮层
  - 奖励反馈层
  - 文本层级
  - 统一圆角和 section 间距

**Step 2: 补充全局基础样式**

- 增加全局 selection、focus-visible、滚动条、容器最大宽度、section 间距等规则。
- 统一桌面与移动端的排版基线，避免各页面各写一套 spacing。

**Step 3: 明确全局文案和元信息边界**

- 检查应用标题、副标题、品牌文案是否和 Landing / 登录 / 学习页中的表达一致。
- 避免出现同一概念多种叫法，如“AI 导师 / AI 教练 / AI 陪练”混用。

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查：

- 首页
- 登录页
- 学习页

确认全局视觉基线未破坏现有页面。

---

### Task 2: 建立统一的已登录态应用壳层

**Files:**
- Create: `components/layout/app-shell.tsx`
- Create: `components/layout/app-mobile-nav.tsx`
- Modify: `components/layout/dashboard-sidebar.tsx`
- Modify: `features/learning/components/sidebar.tsx`
- Modify: `features/learning/pages/learn-page.tsx`
- Modify: `features/progress/pages/map-page.tsx`
- Modify: `features/achievement/pages/achievements-page.tsx`
- Modify: `constants/navigation.ts`
- Modify: `types/navigation.ts`

**Step 1: 抽出登录后统一壳层**

- 将学习页、地图页、成就页共有的导航、品牌区、设置入口、可选侧栏能力抽象到统一 App Shell。
- 保持页面主内容仍归属各 feature，不把业务组件重新塞回 `components/`。

**Step 2: 统一左侧导航信息结构**

- 对齐学习页和地图/成就页左栏的差异。
- 决定哪些信息属于全局壳层：
  - 品牌
  - 一级导航
  - 设置入口
- 决定哪些信息属于页面私有补充：
  - 学习页的用户成长卡和最近记录
  - 地图页的路径统计
  - 成就页的成长细节

**Step 3: 做真正可用的移动端壳层**

- 桌面保留三栏或双栏。
- 平板收敛为主内容 + 抽屉式辅助面板。
- 手机端至少实现：
  - 折叠式主导航
  - 主内容优先
  - 右侧上下文面板改为抽屉或底部 sheet

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查断点：

- 1440px
- 1024px
- 768px
- 390px

重点检查：

- `/learn`
- `/map`
- `/achievements`

---

### Task 3: 打磨营销页、登录页与工具选择页的首屏转化体验

**Files:**
- Modify: `features/marketing/pages/landing-page.tsx`
- Modify: `features/marketing/components/nav.tsx`
- Modify: `features/marketing/components/hero.tsx`
- Modify: `features/marketing/components/how-it-works.tsx`
- Modify: `features/marketing/components/tools.tsx`
- Modify: `features/marketing/components/pricing.tsx`
- Modify: `features/marketing/components/footer.tsx`
- Modify: `features/auth/pages/login-page.tsx`
- Modify: `features/auth/components/login-brand-panel.tsx`
- Modify: `features/auth/components/login-form.tsx`
- Modify: `features/onboarding/pages/onboarding-page.tsx`
- Modify: `features/onboarding/components/tool-selection-step.tsx`
- Modify: `features/onboarding/components/level-selection-step.tsx`

**Step 1: Landing Page 做信息层级收紧**

- 继续保留现有模块顺序。
- 优先优化：
  - Hero 文案呼吸感
  - CTA 对比度
  - section 过渡节奏
  - 工具支持与适合人群的卡片密度
  - 定价区的可信度与 MVP 语气

**Step 2: 登录页减少“表单感”，增强“回到学习流程”的连续性**

- 保持当前左右双栏结构。
- 优化输入聚焦、验证码按钮状态、模式切换和弱文案层级。
- 强化“继续你上次学习进度”的暗示。

**Step 3: 工具选择页提升选择反馈**

- 强化工具卡 hover / selected / recommended 状态。
- 提升 step 1 到 step 2 的切换连续性。
- 让“下一步”和“生成我的学习路径”更像主任务，而不是普通按钮。

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查：

- 首页首屏到 CTA 完整滚动
- 登录切换 tab / mode
- 工具选择和水平选择流程

---

### Task 4: 重构学习页交互细节，让“AI 教练感”更成立

**Files:**
- Modify: `features/learning/pages/learn-page.tsx`
- Modify: `features/learning/components/chat.tsx`
- Modify: `features/learning/components/right-panel.tsx`
- Modify: `features/learning/components/sidebar.tsx`
- Modify: `features/learning/data/learning-content.ts`
- Modify: `features/learning/types.ts`

**Step 1: 提升消息流的教学感**

- 区分“系统目标说明”“AI 引导”“用户输入”“任务反馈”四类展示。
- 调整消息卡片层级、按钮文案和局部高亮，让“下一步”更清楚。

**Step 2: 输入区和快捷操作条做更明确的状态设计**

- 输入为空、发送中、上传预览、失败重试要有清晰反馈。
- 快捷操作按钮按“推进任务 / 寻求帮助 / 请求提示”分组。

**Step 3: 右侧面板从“信息堆砌”改为“任务上下文”**

- 优先保留：
  - 当前目标
  - 本关进度
  - 任务路径
  - 快速提示
  - 下一关预告
- 控制信息密度，避免所有块权重相同。

**Step 4: 为后续真实接口接入预留 UI 状态**

- 消息区补 loading、empty、error、reconnect 预留态。
- 当前任务卡补“未获取到任务信息”的兜底展示。

**Step 5: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查：

- `/learn`
- 聊天气泡节奏
- 快捷操作
- 输入框多行与图片预览
- 窄屏下的主要操作可达性

---

### Task 5: 打磨地图页与成就页的成长反馈体验

**Files:**
- Modify: `features/progress/pages/map-page.tsx`
- Modify: `features/progress/components/map-header.tsx`
- Modify: `features/progress/components/progress-overview.tsx`
- Modify: `features/progress/components/stage-timeline.tsx`
- Modify: `features/progress/components/stage-detail-panel.tsx`
- Modify: `features/progress/data/map-data.ts`
- Modify: `features/achievement/pages/achievements-page.tsx`
- Modify: `features/achievement/components/rank-progress-card.tsx`
- Modify: `features/achievement/components/achievement-stats-grid.tsx`
- Modify: `features/achievement/components/checkin-calendar.tsx`
- Modify: `features/achievement/components/badge-grid.tsx`
- Modify: `features/achievement/components/achievement-sidebar-panels.tsx`
- Modify: `features/achievement/data/achievement-data.ts`

**Step 1: 地图页突出“当前关卡”和“继续学习”**

- 当前节点、可解锁节点、待解锁节点需要更清晰的视觉差异。
- 详情面板要服务“现在就回去继续做”。

**Step 2: 成就页强化“成长积累”而不是“数据罗列”**

- 段位进度卡做成页面最强主视觉。
- 统计卡、打卡、徽章、XP 流水按情绪节奏排序，而不是平均排布。

**Step 3: 两页统一成长语言**

- XP、段位、连续天数、任务数等术语保持一致。
- CTA 风格、标题层级、卡片边界与学习页统一。

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查：

- `/map`
- `/achievements`
- 从地图回到学习
- 从学习理解到成就反馈的连贯性

---

### Task 6: 建立 API-ready 的前端契约层与 mock adapter

**Files:**
- Create: `lib/api/client.ts`
- Create: `lib/api/types.ts`
- Create: `lib/api/mock.ts`
- Create: `lib/api/contracts/auth.ts`
- Create: `lib/api/contracts/onboarding.ts`
- Create: `lib/api/contracts/learning.ts`
- Create: `lib/api/contracts/progress.ts`
- Create: `lib/api/contracts/achievement.ts`
- Modify: `types/`
- Modify: `features/auth/data/login-data.ts`
- Modify: `features/onboarding/data/onboarding-data.ts`
- Modify: `features/learning/data/learning-content.ts`
- Modify: `features/progress/data/map-data.ts`
- Modify: `features/achievement/data/achievement-data.ts`

**Step 1: 按 API 文档建立统一响应结构**

- 抽出基础响应 envelope：
  - `code`
  - `message`
  - `data`
- 定义和 API 文档一致的前端 contract type，不直接把页面组件绑死在本地数组结构上。

**Step 2: 把页面静态数据改造成 contract-shaped mock**

- 页面仍使用 mock 数据。
- 但 mock 输出结构尽量贴近未来真实接口返回。

**Step 3: 建立最薄的 client / repository 边界**

- 当前不接真实接口。
- 但页面不再直接 import 原始静态数组，而是通过 mock adapter 获取数据。
- 为未来切换到 `/api/*` 只保留一层替换面。

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

人工检查所有页面数据是否仍正常渲染。

---

### Task 7: 补齐全局反馈态与质量基线

**Files:**
- Modify: `providers/app-providers.tsx`
- Create: `constants/events.ts`
- Create: `types/api.ts`
- Create: `components/ui/state-panel.tsx`
- Create: `components/ui/page-section.tsx`
- Modify: `features/auth/*`
- Modify: `features/learning/*`
- Modify: `features/progress/*`
- Modify: `features/achievement/*`

**Step 1: 建立统一反馈态组件**

- 统一以下状态的视觉表达：
  - loading
  - empty
  - error
  - success

**Step 2: 预留关键埋点常量**

- 只定义前端事件常量和触发点，不接真实埋点平台之外的新系统。
- 至少覆盖：
  - Landing CTA
  - 登录提交
  - 工具选择提交
  - 学习输入发送
  - 快捷帮助操作
  - 地图关卡点击
  - 成就页关键 CTA

**Step 3: 建立前端验收清单**

- 为 6 个页面建立最小人工验收矩阵：
  - 桌面
  - 平板
  - 手机
  - 空状态
  - 交互态

**Step 4: 验证**

Run: `pnpm lint`  
Run: `pnpm build`

补充文档：

- `docs/plans/2026-03-23-ai-coding-tutor-frontend-engineering-guide.md`

---

## 推荐执行顺序

推荐按以下顺序实施：

1. Task 1 全局 token 与基线
2. Task 2 已登录态壳层与响应式
3. Task 4 学习页细化
4. Task 5 地图与成就页打磨
5. Task 3 营销、登录、工具选择页优化
6. Task 6 API-ready 契约层
7. Task 7 反馈态与验收清单

原因：

- 当前最明显的问题不是首页不好看，而是已登录态结构和移动端不可用。
- 学习页是核心价值页，优先级高于营销页精修。
- API-ready 契约层应该在主要界面稳定后补入，否则容易和视觉改动交叉返工。

---

## 本计划的执行边界

本轮前端优化明确不做以下事项：

- 不接入真实后端接口
- 不引入数据库或认证 SDK
- 不新增支付、排行榜、社区等非 MVP 能力
- 不改变现有 6 个页面的信息架构大方向
- 不为 demo 阶段引入过重的状态管理框架

---

## 执行完成后的验收标准

完成本计划后，应达到以下结果：

1. 六个页面在桌面与移动端都可正常浏览和操作。
2. 已登录态页面拥有统一壳层和一致的成长反馈语言。
3. 学习页的“下一步”和“卡住求助”体验明显更清晰。
4. 页面不再直接依赖散落静态数组，而是通过 API-ready mock adapter 取数。
5. 前端具备统一的 loading / empty / error / success 反馈样式。
6. 后续接入 `/api/*` 时，主要替换点集中在 `lib/api` 与 feature adapter，而不是整页重写。

---

Plan complete and saved to `docs/plans/2026-03-24-ai-coding-tutor-frontend-polish-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
