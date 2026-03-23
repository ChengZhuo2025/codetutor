import type {
  LearningKnowledgeTag,
  LearningTask,
  Message,
  RecentSession,
} from "@/features/learning/types"
import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"

export const INITIAL_CONTENT =
  "你好！我是你的 AI 编程教练。你正在学习 **Cursor**，目前处于第 3 关：理解 AI Chat 与 Composer 的区别。\n\n**当前目标：** 用 Cursor 的 Composer 功能创建一个简单的 React 组件\n\n**只需要做这一步：** 打开 Cursor，按 Cmd+I 打开 Composer，输入【创建一个显示当前时间的 React 组件】，观察 AI 如何帮你生成完整文件。\n\n你准备好了吗？或者遇到了什么问题？"

export const initialMessages: Message[] = [
  {
    id: 1,
    role: "ai",
    content: INITIAL_CONTENT,
  },
]

export const suggestions = [
  "我完成了，接下来做什么？",
  "我卡住了，帮我分析一下",
  "能给我一个提示吗？",
]

export const aiResponses = [
  {
    content:
      "太棒了！你已经完成了第 3 关的核心步骤！\n\n**你学到了什么：**\n- Composer 适合生成完整文件或功能块\n- Chat 适合提问和代码解释\n\n**下一步（第 4 关）：** 让 Cursor 帮你调试代码——在一个有 bug 的函数上按 Cmd+K，告诉 AI 问题所在。\n\n准备进入下一关了吗？",
    xp: 10,
    nextStep: "进入第 4 关：AI 调试助手",
  },
  {
    content:
      "没关系，让我来帮你！\n\n**可能遇到的卡点：**\n1. Cmd+I 没有反应？试试菜单栏 View → Composer\n2. Composer 打开了但不知道写什么？先用简单中文描述你想要的结果\n3. AI 生成的代码报错了？把错误信息直接贴给我\n\n你目前卡在哪一步？告诉我具体情况，我来帮你分析。",
  },
  {
    content:
      "好的，给你一个提示\n\n**提示：** 你不需要提前知道 React 语法。直接在 Composer 里用中文描述你想要的效果，比如：创建一个 React 组件，用 useState 保存当前时间，每秒更新一次，用大字体居中显示。\n\nCursor 会自动处理所有技术细节。你的任务只是观察它生成了什么，然后试着运行看看。",
  },
]

export const learningNavItems = getDashboardNavItems(ROUTES.learn)

export const recentSessions: RecentSession[] = [
  { title: "Cursor 基础配置", time: "今天", done: true },
  { title: "第一次 AI 对话", time: "昨天", done: true },
  { title: "项目结构理解", time: "2天前", done: false },
]

export const learningTasks: LearningTask[] = [
  { id: 1, label: "安装 Cursor", done: true },
  { id: 2, label: "完成第一次 AI 对话", done: true },
  { id: 3, label: "理解 Chat vs Composer", done: false, current: true },
  { id: 4, label: "AI 调试助手", done: false },
  { id: 5, label: "多文件上下文", done: false, locked: true },
]

export const learningKnowledgeTags: LearningKnowledgeTag[] = [
  { label: "Composer 模式", color: "text-brand bg-brand-dim border-brand/20" },
  { label: "Chat 模式", color: "text-chart-3 bg-chart-3/10 border-chart-3/20" },
  { label: "AI 上下文", color: "text-chart-5 bg-chart-5/10 border-chart-5/20" },
]
