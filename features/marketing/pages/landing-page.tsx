import { LandingFooter } from "@/features/marketing/components/footer"
import { LandingHero } from "@/features/marketing/components/hero"
import { LandingHowItWorks } from "@/features/marketing/components/how-it-works"
import { LandingNav } from "@/features/marketing/components/nav"
import { LandingPricing } from "@/features/marketing/components/pricing"
import { LandingTools } from "@/features/marketing/components/tools"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingTools />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  )
}
