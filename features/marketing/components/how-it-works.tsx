import { marketingSteps } from "@/features/marketing/data/marketing-content"

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
          {marketingSteps.map((item) => {
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
