import { marketingBenefits } from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"

export function LandingBenefits() {
  return (
    <section id="benefits" className="relative px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            学习收益
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-balance">
            从&ldquo;看过教程&rdquo;到&ldquo;真正学会&rdquo;
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            不再只是收藏和观看，让每次学习都有可见产出和持续反馈
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {marketingBenefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-[28px]  border border-border/70 bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand/24 hover:bg-brand/4 dark:border-white/10 dark:bg-surface-2/88 dark:shadow-none dark:hover:bg-surface-2"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.03),transparent_40%)] opacity-60 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_40%)]" />

                <div
                  className={cn(
                    "relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all group-hover:scale-110",
                    benefit.borderColor,
                    benefit.bgColor,
                  )}
                >
                  <Icon className={cn("h-7 w-7", benefit.color)} />
                </div>

                <h3 className="mb-3 text-lg font-semibold text-foreground">{benefit.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{benefit.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
