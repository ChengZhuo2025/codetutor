import { marketingBenefits } from "@/features/marketing/data/marketing-content"
import { LandingTestimonials } from "@/features/marketing/components/testimonials"
import { cn } from "@/lib/utils"

export function LandingBenefits() {
  return (
    <section id="benefits" className="relative px-5 py-14 scroll-mt-20 sm:px-6 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-9 max-w-3xl text-center lg:mb-12">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            学习收益
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-balance lg:text-4xl">
            从看过教程到<span className="text-brand">真正学会</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            不再只是收藏和观看，让每次学习都有可见产出和持续反馈
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {marketingBenefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="group relative flex items-start gap-4 overflow-hidden border-t border-border/70 px-1 pt-5 transition-all hover:border-brand/40 dark:border-white/10 dark:hover:border-brand/40 sm:block lg:pt-6"
              >
                <div
                  className={cn(
                    "relative z-10 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all group-hover:scale-105 sm:mb-4 sm:mt-0 lg:mb-5 lg:h-12 lg:w-12",
                    benefit.borderColor,
                    benefit.bgColor,
                  )}
                >
                  <Icon className={cn("h-7 w-7", benefit.color)} />
                </div>

                <div className="min-w-0 pt-0.5 sm:pt-0">
                  <h3 className="mb-1 text-base font-semibold leading-5 text-foreground lg:mb-3 lg:text-lg">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-5 text-muted-foreground sm:leading-6">
                    {benefit.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <LandingTestimonials />
      </div>
    </section>
  )
}
