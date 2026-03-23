"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Level = "beginner" | "intermediate" | "advanced"

const tools = [
  { id: "cursor",      name: "Cursor",      category: "图形化 IDE", desc: "AI 原生代码编辑器，最适合入门",      popular: true,  color: "brand"   },
  { id: "claude-code", name: "Claude Code", category: "CLI 工具",   desc: "Anthropic 官方 CLI，命令行 AI 编程", popular: false, color: "chart-3" },
  { id: "trae",        name: "Trae",        category: "图形化 IDE", desc: "字节出品，中文支持好",               popular: true,  color: "brand"   },
  { id: "windsurf",    name: "Windsurf",    category: "图形化 IDE", desc: "Codeium 出品，Agent 模式强大",       popular: false, color: "chart-5" },
  { id: "bolt",        name: "Bolt.new",    category: "在线工具",   desc: "浏览器直接运行，零安装门槛",         popular: false, color: "gold"    },
  { id: "codex",       name: "Codex CLI",   category: "CLI 工具",   desc: "OpenAI 官方 CLI，轻量高效",          popular: false, color: "chart-5" },
  { id: "lovable",     name: "Lovable",     category: "在线工具",   desc: "前端生成工具，无需编程即可建站",     popular: false, color: "gold"    },
  { id: "kiro",        name: "Kiro",        category: "图形化 IDE", desc: "AWS 出品，规格文档驱动开发",         popular: false, color: "chart-3" },
]

const levels: { id: Level; label: string; desc: string }[] = [
  { id: "beginner",     label: "完全入门",   desc: "没有编程基础，想从零开始" },
  { id: "intermediate", label: "有一定基础", desc: "了解基本编程，想提升 AI 工具效率" },
  { id: "advanced",     label: "进阶提升",   desc: "有项目经验，想系统化 AI 编程方法论" },
]

const colorMap: Record<string, string> = {
  brand:     "border-brand/40 bg-brand-dim text-brand",
  "chart-3": "border-chart-3/40 bg-chart-3/10 text-chart-3",
  "chart-5": "border-chart-5/40 bg-chart-5/10 text-chart-5",
  gold:      "border-gold/40 bg-gold-dim text-gold",
}

const selectedBorderMap: Record<string, string> = {
  brand:     "border-brand",
  "chart-3": "border-chart-3",
  "chart-5": "border-chart-5",
  gold:      "border-gold",
}

export function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [level, setLevel] = useState<Level | null>(null)

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const canGoNext = selectedTools.length > 0
  const canFinish = level !== null

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/50 bg-surface-1/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-semibold">CodeTutor</span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                s === step ? "w-6 bg-brand" : s < step ? "w-2 bg-brand/50" : "w-2 bg-surface-4"
              )}
            />
          ))}
        </div>
        <div className="w-24" />
      </header>

      {/* Sliding viewport */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: step === 1 ? "translateX(0%)" : "translateX(-50%)", width: "200%" }}
        >
          {/* STEP 1 */}
          <div className="w-1/2 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              <div className="mb-8 text-center">
                <p className="mb-2 text-sm font-medium text-muted-foreground">第 1 步，共 2 步</p>
                <h1 className="mb-2 text-3xl font-bold tracking-tight">你想学哪个 AI 编程工具？</h1>
                <p className="text-muted-foreground">可以选择多个，我们会为每个工具生成专属学习路径</p>
              </div>

              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {tools.map((tool) => {
                  const isSelected = selectedTools.includes(tool.id)
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={cn(
                        "relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all",
                        isSelected
                          ? `${selectedBorderMap[tool.color]} bg-surface-2 shadow-[0_0_20px_oklch(0.78_0.15_180/0.08)]`
                          : "border-border/60 bg-surface-2 hover:border-border"
                      )}
                    >
                      {tool.popular && !isSelected && (
                        <span className="absolute right-4 top-4 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          推荐
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-brand-foreground" />
                        </div>
                      )}
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold", colorMap[tool.color])}>
                        {tool.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="font-semibold">{tool.name}</span>
                          <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{tool.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-col items-center gap-3 pb-10">
                {selectedTools.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    已选择{" "}
                    <span className="font-semibold text-brand">{selectedTools.length}</span>{" "}
                    个工具
                  </p>
                )}
                <Button
                  onClick={() => canGoNext && setStep(2)}
                  disabled={!canGoNext}
                  className={cn(
                    "h-12 w-full max-w-sm text-base font-semibold",
                    canGoNext
                      ? "bg-brand text-brand-foreground hover:bg-brand/90"
                      : "cursor-not-allowed opacity-40"
                  )}
                >
                  下一步：设置水平
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">之后可以随时添加或更改工具</p>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="w-1/2 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              <div className="mb-8 text-center">
                <p className="mb-2 text-sm font-medium text-muted-foreground">第 2 步，共 2 步</p>
                <h1 className="mb-2 text-3xl font-bold tracking-tight">你目前的编程水平是？</h1>
                <p className="text-muted-foreground">我们会根据你的水平调整学习节奏和内容深度</p>
              </div>

              <div className="mb-8 flex flex-wrap justify-center gap-2">
                {selectedTools.map((id) => {
                  const tool = tools.find((t) => t.id === id)
                  if (!tool) return null
                  return (
                    <span key={id} className={cn("rounded-full border px-3 py-1 text-xs font-medium", colorMap[tool.color])}>
                      {tool.name}
                    </span>
                  )
                })}
              </div>

              <div className="mb-10 space-y-3">
                {levels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all",
                      level === l.id
                        ? "border-brand bg-brand-dim"
                        : "border-border/60 bg-surface-2 hover:border-border"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      level === l.id ? "border-brand bg-brand" : "border-border/60"
                    )}>
                      {level === l.id && <div className="h-2 w-2 rounded-full bg-brand-foreground" />}
                    </div>
                    <div>
                      <p className="font-semibold">{l.label}</p>
                      <p className="text-sm text-muted-foreground">{l.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 pb-10">
                <Button
                  onClick={() => canFinish && router.push("/learn")}
                  disabled={!canFinish}
                  className={cn(
                    "h-12 w-full max-w-sm text-base font-semibold",
                    canFinish
                      ? "bg-brand text-brand-foreground hover:bg-brand/90"
                      : "cursor-not-allowed opacity-40"
                  )}
                >
                  生成我的学习路径
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  返回修改工具选择
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
