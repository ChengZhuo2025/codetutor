"use client"

import { useState } from "react"
import { LandingBenefits } from "@/features/marketing/components/benefits"
import { LandingFinalCta } from "@/features/marketing/components/final-cta"
import { LandingFooter } from "@/features/marketing/components/footer"
import { LandingHero } from "@/features/marketing/components/hero"
import { LandingHowItWorks } from "@/features/marketing/components/how-it-works"
import { LandingNav } from "@/features/marketing/components/nav"
import { LandingPricing } from "@/features/marketing/components/pricing"
import { LandingAuthProvider } from "@/features/marketing/providers/landing-auth-provider"
import { LandingTools } from "@/features/marketing/components/tools"
import { FALLBACK_FREE_PLAN_FEATURE_LABEL } from "@/features/marketing/data/marketing-content"

export function LandingPage() {
  const [freePlanFeatureLabel, setFreePlanFeatureLabel] = useState(
    FALLBACK_FREE_PLAN_FEATURE_LABEL,
  )

  return (
    <LandingAuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        <LandingNav />
        <main>
          <LandingHero />
          <LandingHowItWorks />
          <LandingTools />
          <LandingBenefits />
          <LandingPricing onFreePlanFeatureLabelChange={setFreePlanFeatureLabel} />
          <LandingFinalCta freePlanFeatureLabel={freePlanFeatureLabel} />
        </main>
        <LandingFooter />
      </div>
    </LandingAuthProvider>
  )
}
