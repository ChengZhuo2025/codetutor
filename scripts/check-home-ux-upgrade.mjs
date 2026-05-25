import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const heroSource = source("features/marketing/components/hero.tsx")
const navSource = source("features/marketing/components/nav.tsx")
const toolsSource = source("features/marketing/components/tools.tsx")
const benefitsSource = source("features/marketing/components/benefits.tsx")
const pricingSource = source("features/marketing/components/pricing.tsx")
const finalCtaSource = source("features/marketing/components/final-cta.tsx")
const dataSource = source("features/marketing/data/marketing-content.ts")
const globalCss = source("app/globals.css")

assert.match(
  heroSource,
  /lg:grid-cols-\[[^\]]+\]/,
  "LandingHero should use a desktop split layout so product proof appears in the first viewport.",
)

assert.doesNotMatch(
  heroSource,
  /min-h-screen flex-col items-center justify-center/,
  "LandingHero should not stack all hero content vertically before the product preview.",
)

assert.match(
  navSource,
  /aria-expanded=\{mobileOpen\}/,
  "LandingNav mobile menu button should expose its expanded state.",
)

assert.match(
  navSource,
  /aria-controls="landing-mobile-menu"/,
  "LandingNav mobile menu button should point to the mobile menu panel.",
)

assert.match(
  navSource,
  /id="landing-mobile-menu"/,
  "LandingNav should render an identifiable mobile menu panel.",
)

assert.match(
  navSource,
  /fixed inset-x-0 bottom-0 top-\[68px\]/,
  "LandingNav mobile menu should use a fixed overlay/sheet instead of mixing with page content.",
)

assert.match(
  navSource,
  /document\.body\.style\.overflow/,
  "LandingNav should lock body scrolling while the mobile menu is open.",
)

assert.match(
  navSource,
  /role="dialog"/,
  "LandingNav mobile menu should expose dialog semantics.",
)

assert.match(
  navSource,
  /aria-modal="true"/,
  "LandingNav mobile menu should mark the overlay as modal.",
)

assert.match(
  navSource,
  /fixed inset-x-0 bottom-0 z-50 md:hidden/,
  "LandingNav should provide a mobile sticky CTA so long mobile pages keep the primary action reachable.",
)

assert.match(
  heroSource,
  /lg:hidden[\s\S]+移动端精简预览/,
  "LandingHero should render a compact mobile-only product preview.",
)

assert.match(
  heroSource,
  /hidden overflow-hidden[\s\S]+lg:block/,
  "LandingHero should keep the full desktop product preview out of the mobile flow.",
)

assert.match(
  heroSource,
  /lg:hidden"[\s\S]+?\n {10}<\/div>\n {8}<\/div>\n\n {8}<div className="hidden overflow-hidden/,
  "LandingHero desktop preview should be a sibling grid column, not nested inside the text column.",
)

assert.match(
  toolsSource,
  /md:hidden[\s\S]+更多工具/,
  "LandingTools should collapse less important mobile tool choices behind a secondary group.",
)

assert.match(
  benefitsSource,
  /flex items-start gap-4[\s\S]+sm:block/,
  "LandingBenefits mobile cards should use a left icon and right copy layout.",
)

assert.match(
  benefitsSource,
  /lg:mb-3[\s\S]+text-sm leading-5/,
  "LandingBenefits mobile copy should keep title and description tightly grouped.",
)

for (const [name, sourceText] of [
  ["LandingHero", heroSource],
  ["LandingFinalCta", finalCtaSource],
]) {
  assert.match(
    sourceText,
    /免费开始第一课/,
    `${name} should use the unified guest primary CTA copy.`,
  )
  assert.match(
    sourceText,
    /查看学习方式/,
    `${name} should use the unified secondary CTA copy.`,
  )
  assert.doesNotMatch(
    sourceText,
    /免费开始学习|立即行动|看看学习方式|了解学习方式/,
    `${name} should not keep legacy mixed CTA wording.`,
  )
}

assert.match(
  finalCtaSource,
  /freePlanFeatureLabel/,
  "LandingFinalCta should receive the current free-plan quota copy instead of using a stale local constant.",
)

assert.doesNotMatch(
  dataSource,
  /MARKETING_FREE_PLAN_CHAT_QUOTA_COPY/,
  "Marketing data should not export a duplicate free-plan quota constant.",
)

assert.match(
  pricingSource,
  /onFreePlanFeatureLabelChange/,
  "LandingPricing should expose the current free-plan feature copy to the final CTA.",
)

assert.match(
  toolsSource,
  /useState/,
  "LandingTools should support interactive tool selection.",
)

assert.match(
  toolsSource,
  /aria-pressed=\{activeTool/,
  "LandingTools tool choices should expose pressed state.",
)

assert.match(
  toolsSource,
  /selectedTool/,
  "LandingTools should render the selected tool example instead of a static-only tool list.",
)

assert.match(
  globalCss,
  /hero-chat-scroll/,
  "Global reduced-motion styles should cover the hero chat animation.",
)

assert.match(
  globalCss,
  /animate-fadeUp/,
  "Global reduced-motion styles should cover marketing entrance animations.",
)

console.log("Home UX upgrade checks passed.")
