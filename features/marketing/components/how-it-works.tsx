import { Upload, Bot, Trophy } from "lucide-react"

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "粘贴你想学的内容",
    description:
      "支持教程链接、视频链接、代码片段或直接提问。把你在 B 站、YouTube、公众号收藏的内容交给 AI。",
    color: "text-brand",
    bg: "bg-brand-dim border-brand/20",
  },
  {
    step: "02",
    icon: Bot,
    title: "AI 拆解成今天能做的步骤",
    description:
      'AI 导师识别你的水平，把内容转化为明确的下一步。用提问和引导带你推进，而不是直接给答案。',
    color: "text-chart-3",
    bg: "bg-chart-3/10 border-chart-3/20",
  },
  {
    step: "03",
    icon: Trophy,
    title: "完成步骤，积累段位",
    description:
      "每完成一步获得学分，从萌新码农进阶到 AI 编程大师。连续打卡保持学习节奏，清楚看到自己的成长。",
    color: "text-gold",
    bg: "bg-gold-dim border-gold/20",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how" className="bg-surface-1 py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            学习方式
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            三步从“看过”走向“做成”
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className={`relative rounded-2xl border p-8 ${item.bg}`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${item.bg}`}>
                    <Icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <span className="font-mono text-4xl font-bold text-muted-foreground/20">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="leading-relaxed text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
