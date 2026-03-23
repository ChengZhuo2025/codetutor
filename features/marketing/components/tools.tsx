import {
  marketingAudiences,
  marketingTools,
} from "@/features/marketing/data/marketing-content"

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
              {marketingTools.map((tool) => (
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
              {marketingAudiences.map((item) => (
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
