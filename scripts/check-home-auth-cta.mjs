import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const heroSource = readFileSync(
  new URL("../features/marketing/components/hero.tsx", import.meta.url),
  "utf8",
)
const finalCtaSource = readFileSync(
  new URL("../features/marketing/components/final-cta.tsx", import.meta.url),
  "utf8",
)
const pricingSource = readFileSync(
  new URL("../features/marketing/components/pricing.tsx", import.meta.url),
  "utf8",
)
const footerSource = readFileSync(
  new URL("../features/marketing/components/footer.tsx", import.meta.url),
  "utf8",
)

const ctaSources = [
  ["LandingHero", heroSource],
  ["LandingFinalCta", finalCtaSource],
  ["LandingPricing", pricingSource],
]

for (const [name, source] of [
  ["LandingHero", heroSource],
  ["LandingFinalCta", finalCtaSource],
  ["LandingPricing", pricingSource],
  ["LandingFooter", footerSource],
]) {
  assert.match(
    source,
    /useLandingAuthState/,
    `${name} should use the shared landing auth state hook.`,
  )
}

assert.match(
  heroSource,
  /ctaLabel/,
  "LandingHero should reuse the shared CTA label when authenticated.",
)

assert.match(
  finalCtaSource,
  /ctaLabel/,
  "LandingFinalCta should reuse the shared CTA label when authenticated.",
)

assert.match(
  pricingSource,
  /ctaLabel/,
  "LandingPricing should reuse the shared CTA label for the free plan when authenticated.",
)

assert.match(
  footerSource,
  /ctaLabel/,
  "LandingFooter should reuse the shared CTA label when authenticated.",
)

for (const [name, source] of ctaSources) {
  assert.match(
    source,
    /<Button[\s\S]{0,120}asChild/,
    `${name} should render CTA links through Button asChild instead of nesting a button inside a link.`,
  )
  assert.doesNotMatch(
    source,
    /<Link[^>]*>\s*<Button/,
    `${name} should not nest a native button inside a Next Link.`,
  )
}

assert.doesNotMatch(
  heroSource,
  /className=\{`/,
  "LandingHero should use cn(...) for conditional class names instead of template strings.",
)

console.log("Home CTA components share authenticated landing state and resume-learning copy.")
