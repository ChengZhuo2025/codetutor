import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const file = "features/marketing/components/nav.tsx"
const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

assert.match(
  source,
  /useLandingAuthState/,
  "LandingNav should use the shared landing auth state hook.",
)

assert.match(
  source,
  /继续学习/,
  "LandingNav should render a continue-learning CTA for authenticated users.",
)

assert.match(
  source,
  /maskedPhone/,
  "LandingNav should show a masked phone label for authenticated users.",
)

assert.match(
  readFileSync(
    new URL("../features/marketing/providers/landing-auth-provider.tsx", import.meta.url),
    "utf8",
  ),
  /requestData<\s*AuthSessionSummaryResponseData\s*>\("\/auth\/session"\)/,
  "LandingAuthProvider should request the authenticated home-session summary.",
)

console.log("Landing nav restores authenticated session state and shows continue-learning actions.")
