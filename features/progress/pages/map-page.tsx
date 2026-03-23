"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Code2,
  BookOpen,
  Map,
  Trophy,
  CheckCircle2,
  Lock,
  Zap,
  Star,
  Play,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  BookMarked,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Stage = {
  id: number
  title: string
  desc: string
  xp: number
  status: "done" | "current" | "available" | "locked"
  tags: string[]
  keyPoints: string[]
  pitfalls: { text: string; isTrap?: boolean }[]
}

const stages: Stage[] = [
  {
    id: 1,
    title: "安装与配置",
    desc: "下载 Cursor，完成基础环境配置",
    xp: 10,
    status: "done",
    tags: ["环境配置"],
    keyPoints: [
      "从 cursor.com 下载对应系统版本",
      "安装后需登录账号激活 AI 功能",
      "建议在安装时勾选「迁移 VS Code 插件」",
    ],
    pitfalls: [
      { text: "首次打开可能需要等待模型索引，约 1-2 分钟，不要关闭", isTrap: true },
      { text: "如果 AI 功能不响应，检查网络代理设置" },
    ],
  },
  {
    id: 2,
    title: "第一次 AI 对话",
    desc: "用 Chat 面板与 AI 进行首次交流",
    xp: 10,
    status: "done",
    tags: ["Chat 模式"],
    keyPoints: [
      "快捷键 Cmd+L（Mac）/ Ctrl+L（Win）打开 Chat",
      "可以直接问「这段代码是什么意思」",
      "AI 回复中的代码块可一键插入编辑器",
    ],
    pitfalls: [
      { text: "Chat 模式不会自动修改文件，只是对话解释" },
      { text: "问题越具体，AI 回答越准确，避免模糊提问", isTrap: true },
    ],
  },
  {
    id: 3,
    title: "Chat vs Composer",
    desc: "理解两种模式的场景差异",
    xp: 10,
    status: "current",
    tags: ["Chat 模式", "Composer"],
    keyPoints: [
      "Chat（Cmd+L）：问答、解释、代码建议，不直接写入文件",
      "Composer（Cmd+I）：直接生成/修改文件，适合大段代码创建",
      "Composer 支持同时操作多个文件",
    ],
    pitfalls: [
      { text: "最常见的卡点：用 Chat 想要生成文件，结果 AI 只给了代码片段", isTrap: true },
      { text: "遇到需要新建文件时，优先选 Composer" },
      { text: "Composer 生成后记得点 Accept 才会真正写入" },
    ],
  },
  {
    id: 4,
    title: "AI 调试助手",
    desc: "用 Cmd+K 定位并修复代码 bug",
    xp: 10,
    status: "available",
    tags: ["调试", "Cmd+K"],
    keyPoints: [
      "选中报错代码后按 Cmd+K 可快速询问 AI",
      "直接把终端报错粘贴给 AI 效果最好",
      "AI 会给出原因分析 + 修复建议",
    ],
    pitfalls: [
      { text: "不要只粘贴报错信息，要一起粘贴相关代码上下文", isTrap: true },
      { text: "修复后记得验证：运行看看是否真的解决了" },
    ],
  },
  {
    id: 5,
    title: "多文件上下文",
    desc: "让 AI 理解整个项目结构",
    xp: 20,
    status: "locked",
    tags: ["上下文", "@引用"],
    keyPoints: [
      "用 @filename 在对话中引用具体文件",
      "@codebase 让 AI 理解整个项目",
      "Cursor Rules 文件可配置全局项目说明",
    ],
    pitfalls: [
      { text: "引用文件过多会导致 AI 回答质量下降，精准引用更重要", isTrap: true },
      { text: "大型项目建议先告诉 AI 项目整体架构" },
    ],
  },
  {
    id: 6,
    title: "自定义 Rules",
    desc: "配置专属编码风格规则",
    xp: 20,
    status: "locked",
    tags: ["Rules", "个性化"],
    keyPoints: [
      "在 .cursorrules 文件中定义 AI 行为规范",
      "可指定语言偏好、代码风格、禁止事项",
      "Rules 对当前项目所有对话生效",
    ],
    pitfalls: [
      { text: "Rules 写得太长会被截断，保持简洁精炼" },
      { text: "避免在 Rules 里写矛盾的要求", isTrap: true },
    ],
  },
  {
    id: 7,
    title: "完整项目实战",
    desc: "用 Cursor 完成一个完整的迷你项目",
    xp: 100,
    status: "locked",
    tags: ["实战", "综合"],
    keyPoints: [
      "从项目初始化到功能完整交付",
      "练习拆解需求、逐步提示 AI",
      "学会 Review AI 代码而非盲目接受",
    ],
    pitfalls: [
      { text: "最大卡点：需求太模糊导致 AI 反复重来，要先想清楚再开始", isTrap: true },
      { text: "实战中遇到问题是正常的，带着问题继续，不要卡住放弃" },
    ],
  },
]

const tools = [
  { id: "cursor", label: "Cursor" },
  { id: "claude", label: "Claude Code" },
  { id: "trae", label: "Trae" },
]

const statusConfig = {
  done: {
    icon: CheckCircle2,
    nodeStyle: "border-brand bg-brand text-brand-foreground",
    cardStyle: "border-brand/20 bg-brand-dim/30",
    label: "已完成",
    labelStyle: "text-brand",
  },
  current: {
    icon: Play,
    nodeStyle:
      "border-brand bg-brand-dim text-brand shadow-[0_0_20px_oklch(0.78_0.15_180/0.4)] animate-pulse",
    cardStyle:
      "border-brand/50 bg-brand-dim shadow-[0_0_30px_oklch(0.78_0.15_180/0.08)] cursor-pointer",
    label: "进行中",
    labelStyle: "text-brand",
  },
  available: {
    icon: ChevronRight,
    nodeStyle: "border-border/60 bg-surface-3 text-muted-foreground",
    cardStyle: "border-border/60 bg-surface-2 hover:border-border cursor-pointer",
    label: "可解锁",
    labelStyle: "text-muted-foreground",
  },
  locked: {
    icon: Lock,
    nodeStyle: "border-border/40 bg-surface-3 text-muted-foreground/40",
    cardStyle: "border-border/30 bg-surface-2/50 opacity-50",
    label: "待解锁",
    labelStyle: "text-muted-foreground/50",
  },
}

export function MapPage() {
  const [activeTool, setActiveTool] = useState("cursor")
  const [selectedId, setSelectedId] = useState<number>(3)
  const router = useRouter()
  const done = stages.filter((s) => s.status === "done").length
  const total = stages.length
  const selected = stages.find((s) => s.id === selectedId) ?? stages[2]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border/50 bg-sidebar">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-semibold">CodeTutor</span>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {[
            { icon: BookOpen, label: "学习", href: "/learn" },
            { icon: Map, label: "闯关地图", href: "/map", active: true },
            { icon: Trophy, label: "成就", href: "/achievements" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-brand-dim text-brand"
                    : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-surface-1/80 px-6 py-4 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight">闯关地图</h1>
            <p className="text-sm text-muted-foreground">
              已完成 {done}/{total} 关 · 累计 120 XP
            </p>
          </div>
          <div className="flex rounded-xl border border-border/60 bg-surface-2 p-1">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTool === t.id
                    ? "bg-surface-4 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar — full width */}
        <div className="shrink-0 border-b border-border/40 px-6 py-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-2 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cursor 学习路径</p>
                <p className="mt-0.5 text-xl font-bold">
                  {Math.round((done / total) * 100)}% 完成
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold-dim px-3 py-1.5">
                <Zap className="h-3.5 w-3.5 text-gold" />
                <span className="text-sm font-bold text-gold">120 / 180 XP</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>萌新码农</span>
              <span>AI 学徒</span>
            </div>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — timeline + cards */}
          <div className="flex w-[52%] shrink-0 flex-col overflow-y-auto border-r border-border/40 px-6 py-6">
            {/* Stage list */}
            <div className="relative">
              {stages.map((stage, idx) => {
                const cfg = statusConfig[stage.status]
                const Icon = cfg.icon
                const isSelected = stage.id === selectedId
                return (
                  <div
                    key={stage.id}
                    className="relative flex gap-4"
                    onClick={() => stage.status !== "locked" && setSelectedId(stage.id)}
                  >
                    {/* Node + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          cfg.nodeStyle,
                          isSelected && stage.status !== "locked" && "ring-2 ring-brand/30 ring-offset-2 ring-offset-background"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {idx < stages.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 flex-1",
                            stage.status === "done" ? "bg-brand/40" : "bg-border/40"
                          )}
                          style={{ minHeight: "24px" }}
                        />
                      )}
                    </div>

                    {/* Card */}
                    <div
                      className={cn(
                        "mb-3 flex-1 rounded-2xl border p-4 transition-all",
                        cfg.cardStyle,
                        isSelected && stage.status !== "locked"
                          ? "ring-1 ring-brand/40"
                          : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{stage.title}</h3>
                            <span className={cn("text-xs font-medium", cfg.labelStyle)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {stage.desc}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gold">
                          <Star className="h-3 w-3" />
                          +{stage.xp}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {stage.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border/50 bg-surface-3 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {stage.status === "current" && (
                        <button
                          onClick={() => router.push("/learn")}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                        >
                          <Play className="h-3.5 w-3.5" />
                          继续学习
                        </button>
                      )}
                      {stage.status === "available" && (
                        <button
                          onClick={() => router.push("/learn")}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                        >
                          开始这一关
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — knowledge panel */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="sticky top-0">
              {/* Panel header */}
              <div className="mb-4 flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-brand" />
                <span className="text-sm font-semibold text-foreground">关键知识点</span>
                <span className="ml-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted-foreground">
                  第 {selected.id} 关
                </span>
              </div>

              {/* Stage title */}
              <div className="mb-4 rounded-xl border border-border/50 bg-surface-2 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">当前查看</p>
                <p className="font-semibold text-sm">{selected.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.desc}</p>
              </div>

              {/* Key points */}
              <div className="mb-4 rounded-xl border border-border/50 bg-surface-2 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-gold" />
                  <span className="text-xs font-semibold text-gold">本关要掌握</span>
                </div>
                <ul className="space-y-2.5">
                  {selected.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-xs leading-relaxed text-foreground/85">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pitfalls */}
              <div className="rounded-xl border border-border/50 bg-surface-2 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive/80">注意事项</span>
                </div>
                <ul className="space-y-2.5">
                  {selected.pitfalls.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full mt-1.5",
                          p.isTrap ? "bg-destructive" : "bg-muted-foreground/50"
                        )}
                      />
                      <div className="flex-1">
                        {p.isTrap && (
                          <span className="mr-1.5 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            卡点提醒
                          </span>
                        )}
                        <span className="text-xs leading-relaxed text-foreground/80">{p.text}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
