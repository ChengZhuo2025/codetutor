import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { marketingPlans } from "@/features/marketing/data/marketing-content"

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-surface-1 py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            定价方案
          </p>
          <h2 className="text-4xl font-bold tracking-tight">
            从免费开始，按需升级
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {marketingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlight
                  ? "border-brand/50 bg-brand-dim shadow-[0_0_40px_oklch(0.78_0.15_180/0.1)]"
                  : "border-border/60 bg-surface-2"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-brand/40 bg-brand px-4 py-1 text-xs font-semibold text-brand-foreground">
                  最受欢迎
                </div>
              )}
              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.desc}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        plan.highlight ? "text-brand" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  className={`w-full font-semibold ${
                    plan.highlight
                      ? "bg-brand text-brand-foreground hover:bg-brand/90"
                      : "border border-border/60 bg-transparent text-foreground hover:bg-surface-3"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
