import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const pricingSource = read("features/marketing/components/pricing.tsx")
const marketingContentSource = read("features/marketing/data/marketing-content.ts")
const loginSource = read("features/auth/pages/login-page.tsx")
const callbackSource = read("app/auth/callback/page.tsx")
const dialogSource = read("components/layout/subscription-detail-dialog.tsx")

assert.match(
  pricingSource,
  /SUBSCRIBE_INTENT_PARAM\s*=\s*"intent=subscribe"/,
  "LandingPricing should use a shared subscribe intent query marker.",
)
assert.match(
  pricingSource,
  /SubscriptionDetailDialog[\s\S]*open=\{subscriptionDialogOpen\}[\s\S]*onOpenChange=\{setSubscriptionDialogOpen\}/,
  "LandingPricing should control the subscription dialog for authenticated users.",
)
assert.match(
  pricingSource,
  /authState\.status === "authenticated"[\s\S]*setSubscriptionDialogOpen\(true\)/,
  "Authenticated pricing CTA clicks should open the subscription dialog without navigation.",
)
assert.match(
  pricingSource,
  /router\.push\(`\$\{ROUTES\.login\}\?\$\{SUBSCRIBE_INTENT_PARAM\}`\)/,
  "Guest pricing CTA clicks should navigate to login with the subscribe intent.",
)
assert.doesNotMatch(
  pricingSource,
  /href:\s*"\/login"/,
  "Dynamic subscription plans should not hard-code /login as the plan href.",
)
assert.match(
  marketingContentSource,
  /name: "个人版"[\s\S]*purchasable: true/,
  "Static personal plan fallback should still enter the subscription flow.",
)
assert.match(
  marketingContentSource,
  /name: "专业版"[\s\S]*purchasable: true/,
  "Static professional plan fallback should still enter the subscription flow.",
)

assert.match(
  loginSource,
  /getLoginRedirectTo[\s\S]*searchParams\.get\("intent"\) === "subscribe"[\s\S]*ROUTES\.home/,
  "LoginPage should preserve subscribe intent when redirecting after login.",
)
assert.match(
  loginSource,
  /router\.(?:push|replace)\(getLoginRedirectTo\(data\.redirectTo\)\)/,
  "LoginPage should route phone login and restored sessions through the intent-aware redirect helper.",
)

assert.match(
  callbackSource,
  /loginRedirectTo[\s\S]*searchParams\.get\("intent"\) === "subscribe"[\s\S]*ROUTES\.home/,
  "OAuth callback should preserve subscribe intent for parent-window and direct redirects.",
)

assert.match(
  dialogSource,
  /open\?: boolean[\s\S]*onOpenChange\?: \(open: boolean\) => void/,
  "SubscriptionDetailDialog should support controlled open state.",
)
assert.match(
  dialogSource,
  /<Dialog open=\{dialogOpen\} onOpenChange=\{setDialogOpen\}>/,
  "SubscriptionDetailDialog should use the controlled-or-internal dialog state.",
)

console.log("Marketing pricing subscription flow preserves subscribe intent and opens the dialog directly.")
