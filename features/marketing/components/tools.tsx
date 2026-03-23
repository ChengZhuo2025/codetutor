const tools = [
  { name: "Cursor", tag: "图形化 IDE", color: "text-brand", dot: "bg-brand" },
  { name: "Claude Code", tag: "CLI 工具", color: "text-chart-3", dot: "bg-chart-3" },
  { name: "Codex CLI", tag: "CLI 工具", color: "text-chart-5", dot: "bg-chart-5" },
  { name: "Trae", tag: "图形化 IDE", color: "text-brand", dot: "bg-brand" },
  { name: "Windsurf", tag: "图形化 IDE", color: "text-chart-3", dot: "bg-chart-3" },
  { name: "Bolt.new", tag: "在线工具", color: "text-gold", dot: "bg-gold" },
  { name: "Lovable", tag: "在线工具", color: "text-gold", dot: "bg-gold" },
  { name: "Kiro", tag: "图形化 IDE", color: "text-chart-5", dot: "bg-chart-5" },
]

const audiences = [
  { label: "产品经理", desc: "零代码基础，想用 AI 做出产品原型" },
  { label: "设计师", desc: "掌握前端实现，让设计稿真正跑起来" },
  { label: "创业者", desc: "快速验证 MVP，自己实现核心功能" },
  { label: "后端开发者", desc: "用 AI 工具提升全栈效率" },
]

export function LandingTools() {
  return (
    <section id="tools" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* Tools */}
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              支持工具
            </p>
            <h2 className="mb-8 text-3xl font-bold tracking-tight">
              主流 AI 编程工具
              <br />
              全部覆盖
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-2 px-4 py-3.5 transition-colors hover:border-border"
                >
                  <div className={`h-2 w-2 rounded-full ${tool.dot}`} />
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.tag}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audiences */}
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              适合人群
            </p>
            <h2 className="mb-8 text-3xl font-bold tracking-tight">
              不需要有编程基础
              <br />
              只需要有学习意愿
            </h2>
            <div className="space-y-3">
              {audiences.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-4 rounded-xl border border-border/60 bg-surface-2 px-4 py-4 transition-colors hover:border-border"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-dim text-xs font-bold text-brand">
                    {item.label[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
